import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Stop, ShuttleLocation } from '@/types';
import { colors } from '@/theme';

interface LiveMapProps {
  stops: Stop[];
  shuttleLocation?: ShuttleLocation | null;
  signalDegraded?: boolean;
  initialRegion?: Region;
}

const DEFAULT_REGION: Region = {
  latitude: 18.614,
  longitude: 73.912,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

export function LiveMap({
  stops,
  shuttleLocation,
  signalDegraded = false,
  initialRegion = DEFAULT_REGION,
}: LiveMapProps) {
  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {stops.map((stop) => (
          <React.Fragment key={stop.id}>
            <Marker
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={stop.name}
              pinColor={stop.kind === 'college' ? colors.primary : colors.accent}
            >
              <View style={[styles.stopDot, stop.kind === 'college' ? styles.collegeDot : styles.hostelDot]}>
                <Ionicons
                  name={stop.kind === 'college' ? 'school' : 'home'}
                  size={14}
                  color={colors.textOnPrimary}
                />
              </View>
            </Marker>
            <Circle
              center={{ latitude: stop.lat, longitude: stop.lng }}
              radius={stop.geofence_radius_m}
              strokeColor={stop.kind === 'college' ? colors.primary : colors.accent}
              fillColor={
                stop.kind === 'college'
                  ? 'rgba(37, 99, 235, 0.08)'
                  : 'rgba(245, 158, 11, 0.08)'
              }
              strokeWidth={1.5}
            />
          </React.Fragment>
        ))}

        {shuttleLocation ? (
          <Marker
            coordinate={{ latitude: shuttleLocation.lat, longitude: shuttleLocation.lng }}
            title="Shuttle"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.shuttle, signalDegraded && styles.shuttleDegraded]}>
              <Ionicons name="bus" size={20} color={colors.textOnPrimary} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  stopDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  collegeDot: {
    backgroundColor: colors.primary,
  },
  hostelDot: {
    backgroundColor: colors.accent,
  },
  shuttle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  shuttleDegraded: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning,
  },
});
