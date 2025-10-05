The idea of a “hierarchy of forces” (i.e. the nested structure of squads, platoons, companies, battalions, brigades, etc.) is fundamental to how situational awareness (SA) / command-and-control (C2) systems like ATAK and FBCB2 (and their successors) present, aggregate, filter, and disseminate information. Below is how they typically incorporate that hierarchy, what challenges arise, and design considerations.

---

## What I mean by “hierarchy of forces”

By “hierarchy of forces,” I refer to the military organizational levels (e.g. element → squad → platoon → company → battalion → brigade → division, etc.), and the doctrine/command relationships (who reports to whom, who commands whom). In a SA system, it matters not only _where_ units are physically, but _which unit, under what command_, what role, what minimum reporting constraints, etc. That hierarchy helps:

- Aggregate data upward (lower units reporting to higher)
- Filter or restrict data flows (e.g. higher echelons see more, lower ones see selective elements)
- Display information differently (e.g. showing icons for subunits, toggling detail levels)
- Support command intent, orders, overlays, and attachments/detachments

Any effective SA / C2 tool must reflect that structure to avoid chaos and “everyone sees everything” overload. Now, how do ATAK and FBCB2 (or equivalent systems) do this?

---

## FBCB2 / Blue Force Tracking side

FBCB2 (Force XXI Battle Command Brigade and Below) is among the earlier U.S. Army systems designed to give a common picture of friendly (“blue”) and enemy (“red”) forces to units down to vehicle/platform level. ([Wikipedia][1])

Here is how it handles hierarchy:

1. **Reporting at lower echelons**
   Each platform (vehicle, unit) is tracked via GPS and periodically transmits its location/status via radio (EPLRS) or satellite (BFT). ([DOTE][2])
   That is the base “leaf node” information in the hierarchy.

2. **Graphic overlays and symbols**
   The system uses military symbology (APP-6 or equivalent) to represent units, using hierarchical symbology conventions (e.g. if you see a company icon on the map, it may internally represent multiple vehicles). ([SciSpace][3])
   The maps and overlays may show aggregated icons (e.g. showing “Company A” rather than dozens of tanks) when zoomed out.

3. **Data aggregation and the Common Operational Picture (COP)**
   Friendly force data is collected and aggregated at higher levels (battalion, brigade) to form the COP, which then is disseminated down to lower echelons. ([Wikipedia][4])
   The COP respects unit hierarchy: the system associates each platform or sub-unit with a higher-level unit.

4. **Filtering, permissions and data “visiblity”**
   Higher echelons can see down; lower echelons may be restricted in what they see from peer units or other branches. The system enforces visibility rules consistent with operational security. ([SciSpace][3])
   For example, not all friendly units in the brigade may be visible to every dismounted soldier, depending on classification and command intent.

5. **Self-descriptive situational awareness (JCR extension)**
   In the Joint Capabilities Release (JCR) upgrade, FBCB2 added a concept of “self-descriptive SA” — each node (unit) can broadcast metadata (e.g. its type, role, command affiliation) so that receivers can better interpret what they see (rather than relying purely on pre-loaded database entries). ([National Defense Magazine][5])
   That helps with dynamic changes (units attaching/detaching, cross-branch operations) so the hierarchy is more flexible.

6. **Operational orders, graphics & overlays tied to unit hierarchy**
   Users can draw graphics (axes of advance, boundaries, routes, etc.) assigned to specific units. The system ties those overlays to the command relationships so that when a unit moves or changes affiliation, the overlays move accordingly. ([SciSpace][3])
   That ensures that orders flow along the hierarchical paths.

7. **Update rates and reporting intervals differentiated by echelon**
   Lower-level platforms might report more frequently, while higher echelons may aggregate and refresh less often to reduce network load, summarized data. The hierarchy allows differential reporting rates.

8. **“Fading” / display persistence**
   Because of network constraints or latency, some unit icons may “freeze” or fade (i.e. not update immediately). The system must handle that gracefully (e.g. indicate staleness). ([DOTE][2])
   The hierarchical context helps in inferring movement: if a subunit stops reporting, but its parent unit is still active, you might infer its likely location.

Overall, FBCB2’s design leans heavily on unit hierarchy to manage scale, limit data overload, and enforce command relationships.

---

## ATAK / TAK (Team Awareness / Tactical Awareness systems)

ATAK (Android Tactical/Team Awareness Kit) is more modern, flexible, and is used not just in military but also public safety, multi-agency contexts. ([Wikipedia][6]) It tends to be more “layered” and less rigidly hierarchical in some deployments, but the same principles apply.

Here's how ATAK (and the broader TAK ecosystem) incorporate hierarchical force structures:

1. **Symbology & icon layering**
   ATAK supports standard military symbology (APP-6) for units, which inherently encodes hierarchical relationships (e.g. icon modifiers show echelon, unit type, affiliation). ([CivTAK / ATAK][7])
   Icons may represent subunits or parent units depending on zoom level or user preferences.

2. **Overlays / layers / map filters**
   ATAK supports layered overlays. Users can enable or disable certain hierarchical levels (e.g. show only companies, hide individual squads) to reduce clutter. ([Department of Homeland Security][8])
   This enables dynamic “zoom-level filtering” where as you zoom out you see only higher-level units; zoom in to see more detail.

3. **Plugin architecture & metadata**
   Because ATAK is plugin-based, mission modules can attach metadata to units (e.g. roles, command relationships, parent unit IDs). That metadata can be used by overlays, filters, messaging, and workflows. ([Federal News Network][9])
   In practice, units may broadcast identifying information (e.g. “I am Platoon 2 of Company A, under Battalion X”) so that others know what they are beyond just a point on the map.

4. **Groupings, attachments, dynamic reassignments**
   ATAK allows users to form groups or units dynamically. You can attach/detach a sensor, UAV, or team to/from different parent units, and the system reflects that in mapping, labels, and command intent tools.
   Because of TAK’s flexible architecture, when a unit is attached to a different higher echelon (e.g. for a particular mission), its metadata can change, and that change propagates visually to other users.

5. **Sharing & filtering of data by command role / permissions**
   In multiuser networks, data flows are controlled by roles/permissions. Higher echelons may subscribe to more data; lower ones receive selectively. The hierarchy of command is thus mirrored in a hierarchy of data access.
   For instance, a battalion command might subscribe to position updates of all subordinate units, while a platoon leader only sees units on his immediate network.
   This is essential to manage bandwidth, relevance, and operational security.

6. **Common Operational Picture (COP) / Unified Situational Awareness**
   ATAK (with a TAK server backbone) helps build a COP, shared across echelons. Everyone sees the same “picture” (or tailored slices of it), but the system knows the hierarchy so that overlays, unit labels, and relationships remain consistent across nodes. ([Department of Homeland Security][8])
   Because the TAK server and clients all agree on ID, parent-child relationships, symbology, and metadata, when one node updates something (e.g. unit relocating, an overlay change), everyone sees a coherent change in the hierarchy.

7. **Intent, orders, “mission threads”**
   ATAK supports attaching orders, intent, waypoints, and tasks to particular units (or parent units). These orders are hierarchically bound, so a brigade-level order may cascade to subordinate companies, which in turn assign tasks to platoons. The system ensures the “chain of intent” is embedded in the data model.
   That way, if a subunit is moved to another parent, or a reorganization happens, their orders and roles update accordingly.

---

## Key design challenges in integrating hierarchical force models

While the above describes how these systems _intend_ to incorporate force hierarchies, actually doing so is nontrivial. Some of the principal challenges:

| Challenge                                          | Explanation / Impact                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scalability & network bandwidth**                | If every soldier reports full detail continuously, the network is overwhelmed. Hierarchy helps by aggregating or filtering data.                                                      |
| **Dynamic reconfiguration**                        | Units may be reassigned, attached/detached, or reorganized in the field. The system must handle changes in hierarchy dynamically.                                                     |
| **Latency, staleness, “fading”**                   | Some units might drop connectivity temporarily. The system must indicate freshness of data and infer reasonable approximations based on parent/neighbor data.                         |
| **Data access / permissions / security**           | Not all units should see all data. Mapping hierarchy to data permissions is essential (need-to-know, compartmentalization).                                                           |
| **Consistency across clients**                     | Every client (e.g. ATAK app, command post system) must interpret symbology, parent-child relationships, overlays, orders in the same way — otherwise mismatches/confusion arise.      |
| **Representation & abstraction**                   | At different zoom levels or echelons, you want different abstractions (e.g. show “Company A” instead of 30 vehicles). The system needs to automatically aggregate and “roll up” data. |
| **Visualization & cognitive load**                 | Even with good filtering, too many icons/wires/overlays can overwhelm users. The hierarchy helps manage visual complexity, but good UI design is essential.                           |
| **Semantic consistency or metadata**               | Units must reliably carry metadata about their identity, parent units, roles. When that metadata is incorrect or stale, misinterpretation results.                                    |
| **Interoperability across systems / joint forces** | When multiple services (Army, Marines, allied nations) each have slightly different hierarchy models, the SA system must reconcile or map them.                                       |

---

## Example flow showing hierarchy in action (simplified)

To illustrate, here’s a simplified, hypothetical scenario of how the system handles hierarchy in practice:

1. At time T0, every vehicle (or team) periodically sends a position update, along with metadata like unit ID, parent unit ID, role (e.g. reconnaissance, fire support).
2. These updates are collected by the local platoon’s unit server (or relay), which forwards them upward (company, battalion).
3. At the company level, the system takes the raw tracks of its subordinate platoons/vehicles and displays an aggregated icon (“Company B”) when viewed at brigade-level scale; when zoomed in, it shows the platoons and even individual vehicles.
4. The battalion command issues a boundary overlay, assigned to specific companies. That overlay is tied to the hierarchy, so that when a company moves units, the overlay moves appropriately.
5. The brigade command’s COP layer includes all subordinate companies. The brigade staff sees metadata linking each company to which battalion, and which platoons are under them.
6. A platoon leader using ATAK gets a filtered view: they see their own vehicles, their sister platoons (if permission granted), immediate higher command orders (company-level overlays), and maybe limited situational data about neighboring companies.
7. If a company is temporarily attached to a different battalion (for a particular mission), its metadata is updated to reflect the temporary command relationship. Its overlays, orders, and data feed now shift into that battalion’s COP context.
8. If a vehicle stops reporting (communication failure), its parent platoon’s other vehicles and the company-level motions may help infer its likely location until it transmits again; the UI may dim or “fade” that icon to show uncertainty.

---

## Summary

- Situational awareness / C2 systems like **FBCB2** and **ATAK** inherently rely on a **hierarchical force model** to manage complexity, scale, and command relationships.
- They do this by combining **metadata**, **symbolic representation**, **filtering/aggregation**, **role-based permissions**, **dynamic reconfiguration (attachments/detachments)**, and a shared **common operational picture** across echelons.
- The hierarchy lets the system avoid overwhelming detail, enforce command intent, maintain consistent overlays/orders, and support command & control workflows.

If you like, I can show you concrete data models (schemas) or message formats used in ATAK/TAK or FBCB2 that embed the hierarchy. Would you like me to dig that?

[1]: https://en.wikipedia.org/wiki/Force_XXI_Battle_Command_Brigade_and_Below?utm_source=chatgpt.com "Force XXI Battle Command Brigade and Below"
[2]: https://www.dote.osd.mil/Portals/97/pub/reports/FY2011/army/2011fbcb2.pdf?ver=2019&utm_source=chatgpt.com "Force XXI Battle Command Brigade and Below (FBCB2)"
[3]: https://scispace.com/pdf/a-practical-guide-for-exploiting-fbcb2-capabilities-oulnx4j0xz.pdf?utm_source=chatgpt.com "A Practical Guide for Exploiting FBCB2 Capabilities"
[4]: https://en.wikipedia.org/wiki/Common_operational_picture?utm_source=chatgpt.com "Common operational picture"
[5]: https://www.nationaldefensemagazine.org/articles/2008/1/31/2008february-army-to-create-hybrid-network-of-incompatible-blueforce-trackers?utm_source=chatgpt.com "Army to Create 'Hybrid' Network of Incompatible Blue-Force ..."
[6]: https://en.wikipedia.org/wiki/Android_Team_Awareness_Kit?utm_source=chatgpt.com "Android Team Awareness Kit"
[7]: https://www.civtak.org/atak-about/?utm_source=chatgpt.com "Android Team Awareness Kit or ATAK / CivTAK"
[8]: https://www.dhs.gov/sites/default/files/publications/tactical_awareness_kit_508.pdf?utm_source=chatgpt.com "Team Awareness Kit (TAK)"
[9]: https://federalnewsnetwork.com/wp-content/uploads/2020/06/Panasonic-ATAK-Top5-WhitePaper-Final-040620-1.pdf?utm_source=chatgpt.com "5 Things Military Leaders Need to Know About ATAK"
