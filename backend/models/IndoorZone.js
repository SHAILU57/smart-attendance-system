const mongoose = require('mongoose');

// An indoor zone: a (building, floor, room) triple mapped to a
// BLE beacon and/or Wi-Fi access point identifier.
// The identifier is what a mobile app / agent reports.
const indoorZoneSchema = new mongoose.Schema(
  {
    zoneId: {
      type: String,
      required: [true, 'Zone ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    }, // e.g. "ZONE_A204"
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: [true, 'Building reference is required'],
    },
    floor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: [true, 'Floor reference is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: [true, 'Classroom reference is required'],
    },
    beaconId: { type: String, trim: true, default: '' }, // e.g. "BEACON_A2"
    wifiSsid: { type: String, trim: true, default: '' }, // e.g. "COL-WIFI-A204"
    wifiBssid: { type: String, trim: true, default: '' }, // e.g. "AA:BB:CC:DD:EE:FF"
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One beacon/ssid cannot belong to two zones
indoorZoneSchema.index({ beaconId: 1 }, { unique: true, sparse: true });
indoorZoneSchema.index({ wifiSsid: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('IndoorZone', indoorZoneSchema);