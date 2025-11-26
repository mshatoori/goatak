ShipStaticData

An ShipStaticData AIS message contains static data about the vessel, such as its name, call sign, length, width, and type of vessel. It also includes information about the vessel's owner or operator, as well as its place of build and its gross tonnage. This message is transmitted at regular intervals, usually every few minutes, and is used by other vessels and coastal authorities to identify and track the vessel. It is an important safety feature that helps to prevent collisions and improve navigation in crowded waterways.

Attributes
MessageID Integer
RepeatIndicator Integer
UserID Integer
Valid Boolean
AisVersion Integer
ImoNumber Integer
CallSign String
Name String
Type Integer
Dimension ShipStaticData_Dimension
FixType Integer
Eta ShipStaticData_Eta
MaximumStaticDraught Double
Destination String
Dte Boolean
Spare Boolean

```json
{
  "AisVersion": 2,
  "CallSign": "LBHF",
  "Destination": "COASTGUARD@@@@@@@@H",
  "Dimension": {
    "A": 20,
    "B": 27,
    "C": 7,
    "D": 7
  },
  "Dte": false,
  "Eta": {
    "Day": 0,
    "Hour": 0,
    "Minute": 0,
    "Month": 0
  },
  "FixType": 1,
  "ImoNumber": 9353333,
  "MaximumStaticDraught": 4.5,
  "MessageID": 5,
  "Name": "KV FARM",
  "RepeatIndicator": 0,
  "Spare": false,
  "Type": 55,
  "UserID": 257069200,
  "Valid": true
}
```
