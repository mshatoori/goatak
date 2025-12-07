PositionReport

An PositionReport AIS message is used to report the vessel's current position, heading, speed, and other relevant information to other vessels and coastal authorities. This message includes the vessel's unique MMSI (Maritime Mobile Service Identity) number, the latitude and longitude of its current position, the vessel's course over ground (COG) and speed over ground (SOG), the type of navigation status the vessel is in (e.g. underway using engine, anchored, etc.), and the vessel's dimensional information (length, width, and type). This information is used to help identify and track vessels in order to improve safety, efficiency, and compliance in the maritime industry.

Attributes
MessageID Integer
RepeatIndicator Integer
UserID Integer
Valid Boolean
NavigationalStatus Integer
RateOfTurn Integer
Sog Double
PositionAccuracy Boolean
Longitude Double
Latitude Double
Cog Double
TrueHeading Integer
Timestamp Integer
SpecialManoeuvreIndicator Integer
Spare Integer
Raim Boolean
CommunicationState Integer

```json
{
  "Cog": 0,
  "CommunicationState": 59916,
  "Latitude": 51.44458833333333,
  "Longitude": 3.590816666666667,
  "MessageID": 1,
  "NavigationalStatus": 7,
  "PositionAccuracy": true,
  "Raim": true,
  "RateOfTurn": 0,
  "RepeatIndicator": 0,
  "Sog": 0,
  "Spare": 0,
  "SpecialManoeuvreIndicator": 0,
  "Timestamp": 12,
  "TrueHeading": 17,
  "UserID": 245473000,
  "Valid": true
}
```
