Based on my analysis of the UI components, here is a comprehensive list of numbers that still need to be converted to fa-IR (Persian) locale:

## Numbers Requiring fa-IR Locale Conversion

### 1. **UnitDetails.js** ([`front/static/js/components/UnitDetails.js`](front/static/js/components/UnitDetails.js))

- **Line 372**: `{{Utils.sp(item.speed)}} KM/H` - Speed value
- **Line 381**: `{{item.hae.toFixed(1)}}` - Altitude value
- **Line 524-526**: Number input min/max values (`min="1"`, `max="168"`) - These are HTML attributes but the displayed value should be localized

### 2. **NavigationInfo.js** ([`front/static/js/components/NavigationInfo.js`](front/static/js/components/NavigationInfo.js))

- **Line 36**: `${this.navigationData.bearing.toFixed(1)}°T` - Bearing degrees
- **Line 42**: `${distance.toFixed(0)}m` - Distance in meters
- **Line 43**: `${(distance / 1000).toFixed(1)}km` - Distance in kilometers

### 3. **CasevacDetails.js** ([`front/static/js/components/CasevacDetails.js`](front/static/js/components/CasevacDetails.js))

- **Line 222**: `{{ item.casevac_detail?.urgent || 0 }}` - Urgent patient count
- **Line 228**: `{{ item.casevac_detail?.priority || 0 }}` - Priority patient count
- **Line 234**: `{{ item.casevac_detail?.routine || 0 }}` - Routine patient count
- **Line 269**: `{{ item.casevac_detail?.litter || 0 }}` - Litter count
- **Line 277**: `{{ item.casevac_detail?.ambulatory || 0 }}` - Ambulatory patient count
- **Line 291**: `{{ item.casevac_detail?.us_military || 0 }}` - US military count
- **Line 299**: `{{ item.casevac_detail?.us_civilian || 0 }}` - US civilian count
- **Line 307**: `{{ item.casevac_detail?.nonus_military || 0 }}` - Non-US military count
- **Line 317**: `{{ item.casevac_detail?.nonus_civilian || 0 }}` - Non-US civilian count
- **Line 323**: `{{ item.casevac_detail?.epw || 0 }}` - EPW count
- **Line 331**: `{{ item.casevac_detail?.child || 0 }}` - Child count
- **Line 380**: `{{ item.casevac_detail?.freq || 0 }}` - Frequency value
- **Lines 246-257**: Security level values (0, 1, 2, 3) in conditional displays
- **Lines 467-470**: Security option values in select dropdown

### 4. **utils.js** ([`front/static/js/utils.js`](front/static/js/utils.js))

- **Line 105**: `(item.speed * 3.6).toFixed(1) + " km/h"` - Speed in km/h
- **Line 109**: `item.hae.toFixed(0) + " m"` - Altitude in meters
- **Line 269**: `distance.toFixed(0) + "m "` - Distance in meters
- **Line 270**: `(distance / 1000).toFixed(1) + "km "` - Distance in kilometers
- **Line 271-272**: `brng.toFixed(1) + "°T"` - Bearing degrees
- **Line 277**: `(v * 3.6).toFixed(1)` - Speed conversion
- **Line 297**: `item.speed.toFixed(0) + " m/s"` - Speed in m/s
- **Line 299**: `item.hae.toFixed(0) + " m"` - Altitude in meters
- **Lines 180-236**: Coordinate formatting functions (`printCoords`) - degrees, minutes, seconds values

### 5. **map.html** ([`cmd/webclient/templates/map.html`](cmd/webclient/templates/map.html))

- **Line 28**: `{{ countByCategory('alarm') }}` - Alarm count
- **Line 40**: `{{ sensorsCount() }}` - Sensors count
- **Line 54**: `{{ flowsCount() }}` - Flows count
- **Line 81**: `{{ contactsNum() }}` - Contacts count
- **Line 112**: `{{ countByCategory('unit') }}` - Units count
- **Line 141**: `{{ countByCategory('point') }}` - Points count
- **Line 169**: `{{ msgNum() }}` - Messages count
- **Line 183**: `{{ msgNum1(m.uid) }}` - Individual message count

## Summary

The main categories of numbers needing localization are:

1. **Counts/Quantities**: Patient counts, item counts, message counts
2. **Measurements**: Speed (km/h, m/s), altitude (m), distance (m, km)
3. **Navigation**: Bearing (degrees), coordinates (degrees/minutes/seconds)
4. **Frequencies**: Radio frequencies
5. **Numeric Input Values**: Min/max constraints and displayed values

**Recommendation**: Implement a global number formatting utility function that converts all numeric displays to Persian (fa-IR) locale using JavaScript's `toLocaleString('fa-IR')` method. This should be applied consistently across all numeric outputs in the UI.
