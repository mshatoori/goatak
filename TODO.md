# TODO

## Incomplete tasks
1. ~~Fence Alarm~~
2. Deactivate alarm
3. Fence around self
5. Work on running the server and adding it to UI (+ login)
8. Handle rabbit write wrap and read unwrap
9. Make UI simpler and more user friendly (names, ...) => What else???
10. We could also make connections persistent (in db)
11. Add config to disable mesh handler
12. Add SensorConnectionRecord in UI ~~(has timer interval)~~ :-?
13. Add active field to feeds
14. Clear Modal 

## Notes:
1. Keep data size under 1k (100bit is preferred)
2. Be ready to deploy on a new network

## Idea:
1. Show received messages in UI (like logs)
3. Overlay Manager (WinTAK) -> Category + Show/Hide
4. Routes: As an object...

## Next Weeks
1. ~~Emergency~~
2. CASEVAC
3. Selecting who to send to.
4. One-page doc of features that we have + we will have (from WinTAK) 
5. Make compatible with WinTAK
   1. What's wrong?
2. ~~Work on better UI (Like WinTAK)~~
   1. ~~ What's the plan?~~
6. Track -> Keep locations in DB, Show in UI
   6. This is hard probably :-?
8. Share with (e.g. Air support) -> Send lat/lng

## NEW

- maybe aggregate data before sending :-?
- What about mission planning and data package? Can we include some objects at least? in a file or something.
- Test GPS TCP proxy
- Make UI more human-readable -> سخت افزار جی پی اس / سیمولاتور جی پی اس
- Re-enable personal fence
  VSPE???



## Documentation

## DONE:
- ~~Fix user info form (submit get 500)~~
- ~~Implement sensors logic (using interfaces)~~
- ~~Fix feed counter in navbar~~
- ~~Better font~~
- ~~Fix delete point~~
- ~~Add radar to sensors (up-to-date enemy positions :-?)~~
- ~~All entities should have names~~
- ~~Add polygon to map and send~~
- ~~Show other nodes as MilSymbol~~
- ~~**پیوست فنی شامل توضیحات پروتکل‌های NMEA و AIS و ...**~~
- ~~**به نسبت سری قبل باید پروپیمون‌تر باشه**~~
- ~~edit polygon won't work~~
- ~~delete polygon and units, test it!~~
- ~~Can't even select polygon~~
- ~~I can't focus on myself!~~
- ~~UI is bad. WinTAK UI is better.~~
- ~~Implement TCP connection for GPS -> send (COM_PORT, TRANSPARENT)~~
- ~~EMERGENCY IS BROKEN~~
- - ~~Alerts can't be seen~~

# Setup
## TODO
- ~~Setup on others...~~
  ~~- TEST!~~
- ~~Download map 16z for tehran~~
- ~~CAN'T CHANGE ADDRESS!~~
- Different icons for emergency types
- Change tools buttons to buttons on map!
- Show Farsi name instead of a-f-G-E-V-A-T-H and put it in infomarker



## Test!
- ~~bug: After reloading page, emergency alarm is reset~~

## Nice To Have
- Maybe? Feed refactor in configs (include rabbit && change how we handle directions)
- Timer to send? Relay others?
- Distance from lines
- Change alerts from modal to sidebar??
- Remove & Edit (side bar) polygon



# New Year TODOs
- Ability to save configs & objects -> DB or Data Package (3 pts)
- Features:
   - Track -> Keep locations in DB, Show in UI (3 pts)
   - Routes -> dist, ... (3 pts)
   - CASEVAC (2 pts)
   - Emergency Icons (0 pts)
   - Stale time for objects -> Are there levels of stale? for example: L1: live L2: show transparent L3: Remove (2 pts)
   - List contacts in send modal (2 pts)
   - Send logs to Seq (1 pts)
- Versioning for docker (1 pts)

- UI is not responsive (8 pts)
- Documents for how android devices can run SA apps & communicate with Radio (8 pts)
- sqlite map (vector) (5 pts)
- !!! Important !!! -> Hierarchy (8 pts)
- Better config management (3 pts)
= GCSS-Army
= DCGS-A
= JBC-P