// air-quality-mobile/App.js
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';

export default function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/air-quality')
      .then(response => setData(response.data))
      .catch(error => console.error(error));
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 18 }}>Air Quality Map</Text>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {data.map((point) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
          >
            <View>
              <Text>{`Air Quality: ${point.airQuality}`}</Text>
              <Text>{`Last Updated: ${new Date(point.updatedAt).toLocaleString()}`}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}
