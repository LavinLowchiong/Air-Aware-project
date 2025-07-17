import React, { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import axios from 'axios';
import io from 'socket.io-client';
import "leaflet/dist/leaflet.css";
import "@fontsource/anton";
import "@fontsource/antic";

// Backend API URL - change this to your deployed backend URL later
const API_BASE_URL = 'http://localhost:3001/api';

const App = () => {
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 6.791164,
    longitude: 79.900497,
    temperature: 0,
    humidity: 0,
    voc: 0,
    pm25: 0,
    pm10: 0,
    pm1: 0,
    rainfall: 0,
    windSpeed: 0,
    windDirection: 'Unknown'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  // Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      console.log('Connected to backend');
      setConnectionStatus('Connected');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setConnectionStatus('Disconnected');
    });

    socket.on('sensor-data', (data) => {
      console.log('Real-time data received:', data);
      updateLocationData(data);
    });

    return () => socket.close();
  }, []);

  // Update location data from backend
  const updateLocationData = (data) => {
    if (data && data.temperature !== undefined) {
      setCurrentLocation({
        latitude: data.location?.latitude || 6.791164,
        longitude: data.location?.longitude || 79.900497,
        temperature: data.temperature || 0,
        humidity: data.humidity || 0,
        voc: data.vocIndex || 0,
        pm25: data.pm25 || 0,
        pm10: data.pm10 || 0,
        pm1: data.pm1 || 0,
        rainfall: data.rainfall || 0,
        windSpeed: data.windSpeed || 0,
        windDirection: data.windDirection || 'Unknown'
      });
      setLastUpdate(new Date(data.timestamp));
    }
  };

  // Fetch latest sensor data
  const fetchLatestData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/latest`);
      const data = response.data;
      
      updateLocationData(data);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      setError('Failed to fetch sensor data. Make sure the backend is running.');
      setIsLoading(false);
      console.error('Error fetching data:', err);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchLatestData();
    
    // Poll for new data every 30 seconds as backup
    const interval = setInterval(fetchLatestData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate Air Quality Index based on PM2.5
  const calculateAQI = (pm25) => {
    if (pm25 <= 12) return 'Good';
    if (pm25 <= 35.4) return 'Moderate';
    if (pm25 <= 55.4) return 'Unhealthy for Sensitive Groups';
    if (pm25 <= 150.4) return 'Unhealthy';
    if (pm25 <= 250.4) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const airQualityMarkers = useMemo(() => [
    {
      id: 1,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      airQuality: calculateAQI(currentLocation.pm25),
      temperature: currentLocation.temperature,
      humidity: currentLocation.humidity,
      voc: currentLocation.voc,
      pm25: currentLocation.pm25,
      pm10: currentLocation.pm10,
      pm1: currentLocation.pm1,
      rainfall: currentLocation.rainfall,
      windSpeed: currentLocation.windSpeed,
      windDirection: currentLocation.windDirection,
      updatedAt: lastUpdate?.toISOString() || new Date().toISOString(),
    },
  ], [currentLocation, lastUpdate]);

  const NavigationBar = React.memo(() => (
    <nav style={navStyles}>
      <h2 style={navTitleStyles}>Air Aware</h2>
      <div style={navLinksContainer}>
        <Link to="/" style={navLinkStyles}>Home</Link>
        <Link to="/insights" style={{ ...navLinkStyles, marginRight: '60px' }}>Insights</Link>
        <span style={connectionStatusStyles}>
          {connectionStatus} {connectionStatus === 'Connected' ? '🟢' : '🔴'}
        </span>
      </div>
    </nav>
  ));

  const LoadingSpinner = () => (
    <div style={loadingStyles}>
      <div style={spinnerStyles}></div>
      <p>Loading sensor data...</p>
    </div>
  );

  const ErrorMessage = () => (
    <div style={errorStyles}>
      <p>⚠️ {error}</p>
      <button onClick={fetchLatestData} style={retryButtonStyles}>
        Retry
      </button>
    </div>
  );

  const InsightsPage = () => {
    const chartUrls = useMemo(() => [
      "https://thingspeak.com/channels/2820612/charts/1?bgcolor=%23ffffff&color=%23d62020&dynamic=true&results=60&title=Temperature&type=line",
      "https://thingspeak.com/channels/2820612/charts/2?bgcolor=%23ffffff&color=%23d62020&dynamic=true&results=60&title=Humidity&type=line",
      "https://thingspeak.com/channels/2820612/charts/3?bgcolor=%23ffffff&color=%23d62020&dynamic=true&results=60&title=Rain+Sensor&type=spline",
      "https://thingspeak.com/channels/2820612/charts/4?bgcolor=%23ffffff&color=%23d62020&dynamic=true&results=60&title=VOC&type=line",
      "https://thingspeak.com/channels/2820612/charts/5?bgcolor=%23ffffff&color=%23d62020&dynamic=true&results=60&type=line&update=15",
      "https://thingspeak.com/channels/2820612/charts/6?bgcolor=%23ffffff&color=%23d62020&dynamic=true&results=60&type=line&update=15"
    ], []);

    return (
      <div style={insightsPageStyles}>
        <NavigationBar />
        <div style={insightsContentStyles}>
          {/* Welcome Section */}
          <div style={welcomeSectionStyles}>
            <div style={welcomeImageContainer}>
              <img 
                src="/public/forest.jpg"
                alt="Forest"
                style={welcomeImageStyles}
              />
            </div>
            <div style={welcomeTextContainer}>
              <p style={welcomeTextStyles}>
                Welcome to Air Aware, your trusted companion for real-time air quality monitoring.
              </p>
            </div>
          </div>

          {/* Current Data Section */}
          <div style={currentDataSectionStyles}>
            <h2 style={sectionTitleStyles}>Current Sensor Readings</h2>
            <div style={currentDataGridStyles}>
              <div style={dataCardStyles}>
                <h3>Temperature</h3>
                <p style={dataValueStyles}>{currentLocation.temperature.toFixed(1)}°C</p>
              </div>
              <div style={dataCardStyles}>
                <h3>Humidity</h3>
                <p style={dataValueStyles}>{currentLocation.humidity.toFixed(1)}%</p>
              </div>
              <div style={dataCardStyles}>
                <h3>PM2.5</h3>
                <p style={dataValueStyles}>{currentLocation.pm25} µg/m³</p>
              </div>
              <div style={dataCardStyles}>
                <h3>VOC Index</h3>
                <p style={dataValueStyles}>{currentLocation.voc.toFixed(0)}</p>
              </div>
              <div style={dataCardStyles}>
                <h3>Wind Speed</h3>
                <p style={dataValueStyles}>{currentLocation.windSpeed.toFixed(1)} m/s</p>
              </div>
              <div style={dataCardStyles}>
                <h3>Wind Direction</h3>
                <p style={dataValueStyles}>{currentLocation.windDirection}</p>
              </div>
            </div>
            {lastUpdate && (
              <p style={lastUpdateStyles}>
                Last updated: {lastUpdate.toLocaleString()}
              </p>
            )}
          </div>

          {/* Sensor Data Section */}
          <div style={sensorDataSectionStyles}>
            <h2 style={sectionTitleStyles}>Historical Data Charts</h2>
            <div style={chartsContainerStyles}>
              {chartUrls.map((src, index) => (
                <div key={index}>
                  <iframe
                    width="450"
                    height="300"
                    style={chartIframeStyles}
                    src={src}
                    title={`Sensor Chart ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* VOC Section */}
          <div style={vocSectionStyles}>
            <h2 style={sectionTitleStyles}>Volatile Organic Compounds<br />(VOC)</h2>
            <div style={contentRowStyles}>
              <iframe
                width="600"
                height="400"
                style={largeIframeStyles}
                src={chartUrls[3]}
                title="VOC Chart"
              />
              <div style={textContentStyles}>
                <p style={paragraphStyles}>
                  Volatile Organic Compounds (VOCs) are organic chemicals that easily evaporate into the air. 
                  They come from various sources including paints, cleaning products, and vehicle emissions. 
                  High VOC levels can cause health issues and contribute to air pollution.
                </p>
              </div>
            </div>
          </div>

          {/* PM2.5 Section */}
          <div style={pmSectionStyles}>
            <h2 style={sectionTitleStyles}>Particulate Matter (PM 2.5,<br />PM 10)</h2>
            <div style={{ ...contentRowStyles, flexDirection: 'row-reverse' }}>
              <div style={textContentStyles}>
                <p style={paragraphStyles}>
                  Particulate Matter (PM) refers to tiny particles in the air that can harm human health when inhaled. 
                  PM2.5 particles are especially dangerous as they can penetrate deep into the lungs and bloodstream.
                </p>
              </div>
              <iframe
                width="600"
                height="400"
                style={largeIframeStyles}
                src={chartUrls[5]}
                title="PM2.5 Chart"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HomePage = () => {
    if (isLoading) return <LoadingSpinner />;

    const widgetUrls = useMemo(() => [
      "https://thingspeak.com/channels/2820612/widgets/1013606",
      "https://thingspeak.com/channels/2820612/widgets/1014636",
      "https://thingspeak.com/channels/2820612/widgets/1018937",
      "https://thingspeak.com/channels/2820612/widgets/1013617",
      "https://thingspeak.com/channels/2820612/widgets/1020462",
      "https://thingspeak.com/channels/2820612/widgets/1020463",
      "https://thingspeak.com/channels/2820612/widgets/1020464"
    ], []);

    return (
      <div style={homePageStyles}>
        <NavigationBar />
        {error && <ErrorMessage />}
        <MapContainer
          center={[currentLocation.latitude, currentLocation.longitude]}
          zoom={15}
          style={mapContainerStyles}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {airQualityMarkers.map((marker) => (
            <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
              <Popup>
                <AirQualityPopup marker={marker} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div style={locationInfoStyles}>
          <h3>Current Location</h3>
          <p>
            Latitude: {currentLocation.latitude} <br />
            Longitude: {currentLocation.longitude}
          </p>
          <h3>Air Quality Data</h3>
          <AirQualityData location={currentLocation} />
        </div>
        <div style={widgetsContainerStyles}>
          {widgetUrls.slice(0, 4).map((url, index) => (
            <iframe
              key={`top-${index}`}
              width={index === 3 ? "300" : "270"}
              height={index === 3 ? "260" : "150"}
              style={widgetIframeStyles}
              src={url}
              title={`Sensor Widget ${index + 1}`}
            />
          ))}
        </div>
        <div style={{ ...widgetsContainerStyles, top: '350px' }}>
          {widgetUrls.slice(4).map((url, index) => (
            <iframe
              key={`bottom-${index}`}
              width="270"
              height="150"
              style={widgetIframeStyles}
              src={url}
              title={`Sensor Widget ${index + 5}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const AirQualityPopup = ({ marker }) => (
    <div>
      <h4>Air Quality Details</h4>
      <ul style={popupListStyles}>
        <li><strong>Latitude:</strong> {marker.latitude}</li>
        <li><strong>Longitude:</strong> {marker.longitude}</li>
        <li><strong>Temperature:</strong> {marker.temperature} °C</li>
        <li><strong>Humidity:</strong> {marker.humidity} %</li>
        <li><strong>VOC:</strong> {marker.voc}</li>
        <li><strong>PM2.5:</strong> {marker.pm25} µg/m³</li>
        <li><strong>PM10.0:</strong> {marker.pm10} µg/m³</li>
        <li><strong>PM1.0:</strong> {marker.pm1} µg/m³</li>
        <li><strong>Wind Speed:</strong> {marker.windSpeed} m/s</li>
        <li><strong>Wind Direction:</strong> {marker.windDirection}</li>
        <li><strong>Air Quality:</strong> {marker.airQuality}</li>
        <li><strong>Last Updated:</strong> {new Date(marker.updatedAt).toLocaleString()}</li>
      </ul>
    </div>
  );

  const AirQualityData = ({ location }) => (
    <ul style={dataListStyles}>
      <li><strong>Temperature:</strong> {location.temperature.toFixed(1)} °C</li>
      <li><strong>Humidity:</strong> {location.humidity.toFixed(1)} %</li>
      <li><strong>VOC:</strong> {location.voc.toFixed(0)}</li>
      <li><strong>PM2.5:</strong> {location.pm25} µg/m³</li>
      <li><strong>PM10.0:</strong> {location.pm10} µg/m³</li>
      <li><strong>PM1.0:</strong> {location.pm1} µg/m³</li>
      <li><strong>Wind Speed:</strong> {location.windSpeed.toFixed(1)} m/s</li>
      <li><strong>Wind Direction:</strong> {location.windDirection}</li>
    </ul>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Routes>
    </Router>
  );
};

// Styles
const navStyles = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: "#000000",
  color: "white",
  padding: "10px 20px",
  zIndex: 1000,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontFamily: "Anton, sans-serif",
};

const navTitleStyles = {
  margin: 0,
  fontSize: "40px"
};

const navLinksContainer = {
  fontFamily: "Antic, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: "20px"
};

const navLinkStyles = {
  color: "white",
  marginRight: "40px",
  fontSize: "24px",
  textDecoration: "none"
};

const connectionStatusStyles = {
  fontSize: "16px",
  fontWeight: "bold",
  padding: "5px 10px",
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: "5px"
};

const loadingStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  backgroundColor: "#f5f5f5"
};

const spinnerStyles = {
  border: "4px solid #f3f3f3",
  borderTop: "4px solid #3498db",
  borderRadius: "50%",
  width: "50px",
  height: "50px",
  animation: "spin 1s linear infinite"
};

const errorStyles = {
  position: "fixed",
  top: "70px",
  left: "20px",
  right: "20px",
  backgroundColor: "#ffebee",
  color: "#c62828",
  padding: "15px",
  borderRadius: "5px",
  border: "1px solid #ffcdd2",
  zIndex: 1001,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const retryButtonStyles = {
  backgroundColor: "#c62828",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "4px",
  cursor: "pointer"
};

const insightsPageStyles = {
  minHeight: "100vh",
  backgroundColor: "#f5f5f5",
  overflow: "scroll"
};

const insightsContentStyles = {
  paddingTop: "80px"
};

const welcomeSectionStyles = {
  display: "flex",
  backgroundColor: "#4CAF50",
  padding: "40px",
  color: "white"
};

const welcomeImageContainer = {
  flex: 1
};

const welcomeImageStyles = {
  width: "100%",
  height: "400px",
  objectFit: "cover"
};

const welcomeTextContainer = {
  flex: 1,
  padding: "20px"
};

const welcomeTextStyles = {
  fontSize: "24px",
  lineHeight: "1.6"
};

const currentDataSectionStyles = {
  padding: "40px",
  backgroundColor: "white",
  margin: "20px 0"
};

const currentDataGridStyles = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
  marginBottom: "20px"
};

const dataCardStyles = {
  backgroundColor: "#f8f9fa",
  padding: "20px",
  borderRadius: "8px",
  textAlign: "center",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
};

const dataValueStyles = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#2196F3",
  margin: "10px 0"
};

const lastUpdateStyles = {
  textAlign: "center",
  color: "#666",
  fontStyle: "italic"
};

const sensorDataSectionStyles = {
  padding: "40px",
  overflow: "hidden"
};

const sectionTitleStyles = {
  textAlign: "center",
  fontSize: "32px",
  marginBottom: "30px"
};

const chartsContainerStyles = {
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
  justifyContent: "center",
  height: "100%"
};

const chartIframeStyles = {
  border: "1px solid #cccccc",
  borderRadius: "8px",
  backgroundColor: "white",
  overflow: "hidden"
};

const vocSectionStyles = {
  backgroundColor: "black",
  color: "white",
  padding: "40px"
};

const pmSectionStyles = {
  backgroundColor: "#4CAF50",
  color: "white",
  padding: "40px"
};

const contentRowStyles = {
  display: "flex",
  gap: "40px",
  alignItems: "center"
};

const largeIframeStyles = {
  border: "1px solid #cccccc",
  borderRadius: "8px"
};

const textContentStyles = {
  flex: 1
};

const paragraphStyles = {
  fontSize: "18px",
  lineHeight: "1.6"
};

const homePageStyles = {
  height: "100vh",
  width: "100vw",
  position: "relative",
  overflow: "hidden"
};

const mapContainerStyles = {
  height: "100%",
  width: "100%",
  marginTop: "50px"
};

const locationInfoStyles = {
  position: "absolute",
  top: "80px",
  left: "20px",
  width: "300px",
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  padding: "16px",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  maxWidth: "300px",
  zIndex: 1000,
};

const widgetsContainerStyles = {
  position: "absolute",
  top: "80px",
  right: "20px",
  display: "flex",
  gap: "10px",
  padding: "10px",
  borderRadius: "8px",
  zIndex: 1000,
};

const widgetIframeStyles = {
  border: "1px solid #cccccc",
  borderRadius: "8px"
};

const popupListStyles = {
  listStyleType: "none",
  padding: 0,
  margin: 0
};

const dataListStyles = {
  listStyle: "none",
  padding: 0,
  margin: 0
};

export default App;