const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: corsOptions
});

// MongoDB Schema
const sensorDataSchema = new mongoose.Schema({
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  vocIndex: { type: Number, required: true },
  vocRaw: { type: Number, required: true },
  pm1: { type: Number, required: true },
  pm25: { type: Number, required: true },
  pm10: { type: Number, required: true },
  rainfall: { type: Number, required: true },
  windSpeed: { type: Number, required: true },
  windDirection: { type: String, required: true },
  location: {
    latitude: { type: Number, default: 6.791164 },
    longitude: { type: Number, default: 79.900497 }
  },
  timestamp: { type: Date, default: Date.now }
});

const SensorData = mongoose.model('SensorData', sensorDataSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airquality')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Air Quality Monitoring API',
    endpoints: {
      '/api/latest': 'Get latest sensor data',
      '/api/data': 'Get all sensor data',
      '/api/data/range': 'Get data within date range',
      '/api/arduino': 'Endpoint for Arduino to send data'
    }
  });
});

// Get latest sensor data
app.get('/api/latest', async (req, res) => {
  try {
    const latestData = await SensorData.findOne().sort({ timestamp: -1 });
    
    if (!latestData) {
      // Return default data if no data exists
      return res.json({
        temperature: 25.0,
        humidity: 60.0,
        vocIndex: 100,
        vocRaw: 25000,
        pm1: 5,
        pm25: 10,
        pm10: 15,
        rainfall: 0.0,
        windSpeed: 2.5,
        windDirection: 'N',
        location: {
          latitude: 6.791164,
          longitude: 79.900497
        },
        timestamp: new Date()
      });
    }
    
    res.json(latestData);
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// Get all sensor data with pagination
app.get('/api/data', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const data = await SensorData.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await SensorData.countDocuments();
    
    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// Get data within date range
app.get('/api/data/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const data = await SensorData.find({
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ timestamp: -1 });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching data range:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// Endpoint for Arduino to send data
app.post('/api/arduino', async (req, res) => {
  try {
    const sensorData = new SensorData(req.body);
    await sensorData.save();
    
    // Emit real-time data to connected clients
    io.emit('sensor-data', sensorData);
    
    console.log('New sensor data received and saved:', sensorData);
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving sensor data:', error);
    res.status(500).json({ error: 'Failed to save sensor data' });
  }
});

// Test endpoint to simulate Arduino data
app.post('/api/test-data', async (req, res) => {
  try {
    const testData = {
      temperature: 25.5 + Math.random() * 10,
      humidity: 55.0 + Math.random() * 20,
      vocIndex: 100 + Math.random() * 100,
      vocRaw: 25000 + Math.random() * 5000,
      pm1: Math.floor(Math.random() * 20),
      pm25: Math.floor(Math.random() * 35),
      pm10: Math.floor(Math.random() * 50),
      rainfall: Math.random() * 2,
      windSpeed: Math.random() * 10,
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      location: {
        latitude: 6.791164,
        longitude: 79.900497
      }
    };

    app.get('/api/test-data', (req, res) => {
  res.json({ message: "Test route is working!" });
});
    
    const sensorData = new SensorData(testData);
    await sensorData.save();
    
    // Emit real-time data to connected clients
    io.emit('sensor-data', sensorData);
    
    console.log('Test data generated and saved');
    res.json({ success: true, message: 'Test data generated', data: testData });
  } catch (error) {
    console.error('Error generating test data:', error);
    res.status(500).json({ error: 'Failed to generate test data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});