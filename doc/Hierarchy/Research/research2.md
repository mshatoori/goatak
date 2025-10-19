# **Echelon-Driven Data Governance and Visualization: A Design Document for Situational Awareness in the TAK Ecosystem**

## **I. Echelon Incorporation in Legacy Situational Awareness Systems**

This analysis examines the architectural precedents set by legacy situational awareness (SA) systems—specifically the Force XXI Battle Command Brigade and Below (FBCB2), Joint Capabilities Release (JCR), Joint Battle Command–Platform (JBC-P), and NettWarrior (NW)—regarding the incorporation of military hierarchy (echelon). The findings reveal a foundational necessity for data filtering and abstraction mechanisms designed to mitigate cognitive load and tailor the Common Operational Picture (COP) to the user's specific command responsibilities. These principles form the basis for the subsequent design recommendations for the Team Awareness Kit (TAK) ecosystem.

### **A. Operational Context and Foundational Principles of SA Management**

#### **Cognitive Load Management and Decision Support**

Situational awareness systems, by definition, facilitate the triad of perception, comprehension, and projection of the battlefield environment \[1\]. The proliferation of sensors and real-time Position Location Information (PLI) generates a massive volume of data. Uncontrolled transmission and display of this raw data results in data density that degrades human comprehension, ultimately leading to cognitive overload and impaired decision-making \[1, 2\]. The requirement for echelon-based management, therefore, stems from the need to reduce the breadth and complexity of the Information Environment (IE) and produce actionable cognition \[2\].  
This necessity extends beyond simply tracking friendly forces. Command and control (C2) effectiveness relies on the abstraction of complex tactical and logistical information. For instance, in sustainment operations, the critical logistics statistics (LOGSTAT) report must provide a logistics snapshot that requires analysis before action \[3\]. A commander requires synthesized analysis and a recommendation for action, not merely a listing of raw numbers, percentages, or color codes \[3\]. The traditional requirement for filtering, observed across legacy systems \[4\], is a formal acknowledgement that effective C2 necessitates reducing cognitive complexity by synthesizing raw data into mission-relevant intelligence aligned with the Commander's Critical Information Requirements (CCIR) \[5, 6\]. The goal is to rigorously enforce the doctrinal principle of "need-to-know" or "need-to-see."

### **B. Operational Use of Legacy Systems Across Echelons (Brigade to Platoon)**

The utility and purpose of SA systems vary significantly based on the command echelon they support.

#### **Higher Echelons and Abstraction**

At the Battalion, Brigade, and higher command levels, JBC-P and FBCB2 were utilized primarily for macro-level battle observation, receiving real-time feedback, and executing C2 functions necessary for decisive operations \[7\]. These command post environments require a comprehensive COP optimized for operational and tactical decision-making \[8\]. The JBC-P system itself was designed to be integrated at every echelon, providing SA and battle command information from the brigade down to the maneuver platform \[9, 10\]. Higher echelons typically rely on systems designed for abstraction, such as the Joint Tactical Common Operational Picture Workstation (JTCW), which serves as the COP interface for Marine Corps battalion and above echelons, integrating JBC-P data feeds into a format conducive to staff planning and command decisions \[8\].

#### **Lower Echelons and Close-Fight SA**

Conversely, lower echelons—platoon and company—depend heavily on SA during the planning and preparation phases, as well as for real-time close fight monitoring, particularly during low-visibility or highly dynamic operations (e.g., breaching operations) \[7\]. The primary functions include fratricide mitigation, detailed land navigation, and local message reporting \[11, 12\]. Nett Warrior (NW), designed as a Soldier-worn mission command system, specifically served the dismounted leader, providing immediate situational awareness and communications internal to the platoon \[11, 13\]. NW provided the vital bridge between the vehicle-mounted systems (JBC-P) and the individual Soldier \[12, 14\].

### **C. Architecture of Echelon-Awareness in Legacy Systems**

#### **FBCB2/JCR Manual Filtering**

In FBCB2 and its successor, JCR, the primary mechanism for managing data density was client-side filtering. Users were required to manually define filters based on specified criteria \[4\]. These criteria included filtering by unit types and echelons, suppressing display of stale or old position report icons, and selecting data essential for a specific task \[4\].  
The reliance on operator input to manually set these filters represents a core limitation in legacy systems. This manual approach introduces inherent risks of inconsistency, human error, and failure to adjust filters during rapid mission phases, potentially degrading the COP. The observation that higher echelons utilized sophisticated, dedicated COP interfaces like the JTCW \[8\] underscores the need for pre-processed, abstracted views tailored for strategic command levels. This highlights that the crucial architectural advancement for the TAK ecosystem must be the transition of this functionality from an inconsistent, client-side manual action to a **server-side automated policy** based on validated user attributes (echelon).

#### **NettWarrior and Network Echelon Segmentation**

Nett Warrior’s effectiveness provides clear lessons regarding network constraints and echelon limits. While NW demonstrated capability at the dismounted platoon level, its effectiveness degraded significantly at the company level due to limitations in the supporting Manpack radio network, resulting in a low PLI message completion rate (44%) that prevented Company Commanders from having full SA \[11\].  
Crucially, NW achieved connectivity to the larger tactical network and interoperability with higher-echelon JBC-P systems through the use of **Tactical Services Gateways (TSG)** or JBC-P equipped vehicles \[4, 15\]. The TSG acted as a network bridge between lower-bandwidth, lower-echelon networks (like the Soldier Radio Waveform, SRW) and the higher-bandwidth networks (Upper Tactical Internet) \[4\]. This architecture establishes that the network transition point between echelons is the ideal technical location to enforce data filtering, throttling, and abstraction policies _before_ data reaches the next level of command. In the TAK architecture, this bridging function must be assumed by a specialized, policy-enforcing component of the TAK Server.

## **II. Technical Foundation: Data Encoding and Standardization**

Effective automated echelon control in TAK requires a standardized means of identifying the position, affiliation, and unit hierarchy of every entity on the map. This is achieved through the integration of the Cursor-on-Target (CoT) data standard with military symbology protocols.

### **A. Data Modeling for Hierarchy: Cursor-on-Target (CoT)**

CoT is the standardized XML-based schema used across the Department of Defense (DoD) for exchanging time-sensitive position and event data \[16, 17, 18\]. It is the technical lingua franca that enables interoperability between proprietary and open-source systems, including TAK \[16\]. The core CoT schema mandates twelve tags and requires an initial setup of hierarchy and privileges to function effectively, meaning that the mechanism for authorization and context is inherently part of the standard’s structure \[16\].

### **B. Encoding Echelon via CoT type and MIL-STD-2525**

The organizational identity of a unit or platform is encoded within the CoT message's type attribute, which defines "what the event is about" \[19\]. For military systems, the type field utilizes the Symbol Identification Code (SIDC) derived from MIL-STD-2525, which specifies symbols for graphical displays in C4I systems \[19, 20\].  
The SIDC is a 15-character alphanumeric identifier that provides the minimum elements required to construct a tactical symbol \[19\]. Critical elements encoded within the SIDC, particularly in the "Atoms" portion of the type tree, include the entity's affiliation (e.g., friendly, hostile, neutral) and its echelon or unit size \[18, 19\].  
The SIDC, delivered via the CoT type field, is thus the only standardized, system-agnostic technical means for the TAK Server and connected clients to programmatically determine the exact echelon, affiliation, and function of any entity. Therefore, policy implementation in the TAK ecosystem must rely entirely on accurately parsing and utilizing the SIDC to link a geospatial position report to a defined unit hierarchy level.  
The relationship between the SIDC components and echelon data is summarized below:  
CoT/MIL-STD-2525 SIDC Mapping to Military Echelon Data (Conceptual)

| SIDC Position/Field             | Description                                                                   | Relevance to Echelon Filtering                                                                         | Actionable TAK Use Case                                                                                      |
| :------------------------------ | :---------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| Position 3 (Affiliation)        | Defines allegiance (Friendly, Hostile)                                        | Determines display parameters and access rules (e.g., PLI only for friendly forces) \[18\]             | Client filter for displaying blue forces                                                                     |
| Position 11 (Echelon/Unit Size) | Defines the command level (Squad, Platoon, Company, Battalion, Brigade, etc.) | Primary key for Server-Side Abstraction and Throttling policies.                                       | Server dynamically aggregates PLI icons based on this value for higher-echelon users.                        |
| CoT \<detail\> Extension        | Additional, non-2525 data (e.g., callsign, unit assignment)                   | Used for granular user-defined filtering and Attribute-Based Access Control (ABAC) policy enforcement. | TAK Server group membership rule (e.g., _If CoT detail attribute matches unit, assign to Unit Group_) \[21\] |

### **C. TAK Ecosystem Architecture for Hierarchy Management**

The TAK ecosystem, especially the TAK Server, provides the necessary infrastructure to automate echelon policy management through robust user administration and enterprise integration.

#### **ABAC Foundation via TAK Server**

TAK Server inherently supports centralized data management and real-time updates across connected clients \[22\]. It manages users and groups either locally or through integration with enterprise services such as Active Directory (AD) or LDAP \[23, 24\].  
This capability enables the implementation of Attribute-Based Access Control (ABAC). By integrating with enterprise identity services, the TAK Server can use user attributes (e.g., organizational structure code, rank, or specific department affiliation) to automatically define group membership via Group Rules \[21, 25\]. Group rules streamline administration and are used to manage application access and provisioning entitlements \[21\].  
This capability represents a significant architectural advantage over legacy systems. Instead of relying on a human operator to manually set filters—a process prone to failure \[4\]—the TAK system can automatically apply a predetermined, doctrinally compliant filter set and abstraction policy. By linking a user's authenticated organizational attribute (e.g., their O-Code from AD/LDAP) to a TAK Group rule \[21\], data flow policy becomes governed, auditable, and dynamically enforced, ensuring the correct echelon view is always presented by default.

## **III. Comprehensive Design Document for TAK Echelon Implementation**

This section provides the architectural blueprint for implementing automated, echelon-based data flow control and visualization within the TAK ecosystem.

### **A. Echelon Definition and Server-Side Policy Design**

#### **Defining the TAK Echelon Attribute (TEA) Schema**

To enforce policy, a standardized attribute structure, the TAK Echelon Attribute (TEA) schema, must be defined and derived from enterprise identity services (AD/LDAP). The TEA defines a user's authoritative place in the command hierarchy.  
**Core TEA Fields:**

- **TEA-ID:** Unique TAK Server identifier, linked to the user's certificate Common Name.
- **TEA-Command_Echelon:** The doctrinally defined command level (e.g., Squad, Platoon, Company, Battalion, Brigade).
- **TEA-O-Group:** The specific unit designation (e.g., 2nd Brigade, 1st Armored Division, or 2-1 AD) \[21\].
- **TEA-Role:** Functional role within the unit (e.g., Commander, S-3, Medic).
- **TEA-Max_View_Distance:** Defines the default geospatial boundary for raw PLI display (e.g., 5 km for a Platoon Leader, 25 km for a Battalion Commander).

The process requires that AD/LDAP synchronization populates user profiles; a Group Rule trigger then automatically assigns the user to a specific TAK Echelon Group; finally, the EDMS applies group-specific policies based on that assignment.

#### **Design Blueprint 1: Server-Side Data Flow Control via EDMS**

The primary mechanism for enforcing echelon policy is the **Echelon Data Management Service (EDMS)**, a core TAK Server plugin or module responsible for dynamically filtering, aggregating, and distributing CoT data based on the recipient's TEA and the originator’s SIDC.  
Policy 1: Throttling and Selective Distribution  
The EDMS is designed to maximize network efficiency and prevent the data saturation observed in legacy systems on low-bandwidth tactical networks \[11\].

1. **Raw PLI Limit:** High-frequency, raw PLI messages (individual entity position reports) are only multicast to the immediate organic group and adjacent elements (e.g., Squad and Platoon HQ). This preserves bandwidth on constrained tactical networks, particularly those relying on radio waveforms \[11, 15\].
2. **Higher Echelon Subscription:** Higher echelons (Battalion and above) are configured to subscribe only to EDMS-processed aggregated data streams rather than raw, individual PLI feeds.

Policy 2: Abstraction and Aggregation Logic (The 2-Echelon Rule)  
To manage cognitive load, the EDMS enforces abstraction by aggregating lower-echelon CoT messages into simplified, symbolic markers for higher command levels. The fundamental doctrinal principle is that commanders require high fidelity for their own echelon and the echelon immediately below them, but subsequent echelons should be abstracted.

- _Rule:_ If a user’s TEA-Command_Echelon is $N$, the EDMS will transmit individual PLI (raw CoT) only for entities within echelon $N$ and $N-1$. Entities operating at echelon $N-2$ and below are presented as a single, abstracted icon.
- _Aggregation:_ Abstraction is performed by dynamically calculating the location and boundary of the aggregated icon (e.g., a Company marker). This location calculation can be the Centroid of all subordinate PLI, or the position of the designated Command Post or Headquarters element.

The following matrix dictates the default data flow controls enforced by the EDMS:  
TAK Server Echelon Group Policy Matrix (EDMS Configuration)

| User Echelon              | TEA-ID        | Data Subscription Scope (Default)                         | Abstraction Policy Applied                                      | Bandwidth Optimization                                               |
| :------------------------ | :------------ | :-------------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------------------- |
| Dismounted Leader (E-1)   | SQD/Fire Team | Raw PLI (organic squad/platoon)                           | None (High fidelity required for immediate vicinity)            | Aggressive throttling based on network limits \[11\]                 |
| Platoon Leader (E-2)      | PLT HQ        | Raw PLI (organic PLT), Aggregated Icon (next higher COY)  | None (High fidelity for close fight) \[7\]                      | Prioritize PLI delivery; filter non-essential C2 data                |
| Company Commander (E-3)   | COY HQ        | Raw PLI (PLT HQ key assets), Aggregated Icons (all PLTs)  | Apply 2-Echelon Rule for E-1 (Squad) PLI aggregation            | Intermediate throttling; control streaming video/large file transfer |
| Battalion Commander (E-4) | BN HQ         | Aggregated Icons (all organic COYs/PLTs), Raw C2 Messages | Apply 2-Echelon Rule for E-2 (PLT) PLI aggregation              | Focus on C2 data, LOGSTAT reports \[3\], and operational boundaries  |
| Brigade Commander (E-5)   | BDE HQ        | Aggregated Icons (all organic BNs), C2 HQs                | High abstraction (Aggregated BN icons, minimal lower PLI) \[8\] | Minimum PLI updates; prioritize macro SA and status reporting        |

### **B. Client-Side Visualization and User Experience Design**

The client-side design focuses on translating the server-side policy and SIDC data into an optimized visual display that aligns with the user's operational scope, utilizing TAK’s rich geospatial capabilities.

#### **Design Blueprint 2: Echelon-Dependent Visualization**

The most effective and intuitive method for visual echelon management is to link data density and symbol detail directly to the map scale, consistent with established cartographic principles \[26, 27\]. This approach ensures that the COP scales appropriately from micro-tactical views to macro-operational displays.  
**Automated Symbology Detail:** The TAK Client must utilize the parsed CoT SIDC Echelon element to dynamically adjust symbol complexity based on the map scale:

- **Zoomed In (Large Scale, Tactical View):** When the map scale is $\\leq 25,000$, the client displays full MIL-STD-2525 SIDC symbol detail, individual PLI icons, and vector movement. This is the level required by dismounted leaders for fratricide mitigation and close navigation.
- **Zoomed Out (Small Scale, Operational View):** When the map scale exceeds $100,000$, the client automatically implements scale-based symbol classes \[27\]. It displays simplified, aggregated icons (e.g., a stylized Battalion marker) and suppresses or hides lower-echelon PLI layers entirely. This maintains the appropriate relative size of symbols and reduces visual density, preventing clutter at strategic scales \[26\].

#### **Recommendation: The TAK Hierarchical Filter and Abstraction Plugin (TH-FAP)**

Although the EDMS enforces default doctrinal policies, users require the flexibility to override these settings to meet specific mission requirements—a capability that was critical in legacy FBCB2/JCR systems \[4\]. The **TAK Hierarchical Filter and Abstraction Plugin (TH-FAP)** is recommended to provide this client-side control and flexibility.  
**Required TH-FAP Functionality:**

1. **Manual Override Filter:** Allow users to manually enable or disable layers based on unit type, affiliation, and data age (e.g., filtering out "stale" icons) \[4\].
2. **Interest Group Definition:** Enable the user to define an "interest group" (e.g., an adjacent Company, a key supporting asset), overriding default EDMS policies to temporarily receive higher-fidelity raw PLI for those specific entities \[11\].
3. **Visualization Toggle:** Allow the user, with appropriate credentials, to toggle between the default "Aggregated View" (EDMS policy-driven) and a "Raw PLI View," useful for specific tasks requiring close monitoring, such as the observation tasks noted for higher echelons in FBCB2 \[7\].

The client-side visualization must follow the below rules:  
Echelon-Specific Visualization and Abstraction Rules (Client-Side TH-FAP Logic)

| User Echelon        | Map Scale Range (Denominator) | Visible SA Data Layer (Default)                                             | Symbolization Type                                               | Display Abstraction Level                     |
| :------------------ | :---------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------- |
| Platoon Leader      | $\\leq 25,000$                | Raw Individual PLI, Key Vehicle Icons, Own Group Track                      | Full MIL-STD-2525 SIDC Iconography                               | High Detail (Individual Movement)             |
| Company Commander   | $25,001$ to $100,000$         | Aggregated Platoon Icons, Key Vehicle PLI (limited range), Adjacent Unit HQ | Standard MIL-STD-2525 Unit Symbols                               | Mixed Detail (Focus on PLT-level groups)      |
| Battalion Commander | $100,001$ to $500,000$        | Aggregated Company/Platoon Icons, Boundary Overlays (AoO)                   | Standard MIL-STD-2525 BATTALION/COMPANY symbols                  | High Abstraction (Operational Picture) \[27\] |
| Brigade Commander   | $\> 500,000$                  | Aggregated Battalion/BDE Icons, C2 HQ Locations, LOGSTAT Indicators         | Simplified/Scale-Based Symbology (Reduced Visual Density) \[26\] | Macro View (Strategic Synchronization)        |

### **C. Implementation Roadmap and Future Considerations**

#### **Phased Integration**

Implementation should follow a structured phase approach:

1. **Phase 1 (Foundation):** Establish AD/LDAP synchronization and fully define TAK Echelon Groups using Group Rules \[21\]. Verify that all transmitting CoT systems embed accurate SIDC data (Echelon/Affiliation) \[19\].
2. **Phase 2 (Server-Side Control):** Deploy the Echelon Data Management Service (EDMS) plugin to the TAK Server. Implement core policies: Throttling (Policy 1\) and the 2-Echelon Abstraction Rule (Policy 2). This phase must include rigorous performance testing to validate network stability under maximum data load.
3. **Phase 3 (Client-Side UX):** Develop and field the TAK Hierarchical Filter and Abstraction Plugin (TH-FAP), ensuring seamless integration with standard ATAK functionality. Implement scale-based symbology changes and ensure user authentication dictates default policy application.

#### **Network Performance and Data Integrity**

The design must proactively address the reliability challenges noted in NettWarrior testing, where low message completion rates critically impacted situational awareness \[11\]. The EDMS must dynamically manage bandwidth by adjusting PLI update rates for large groups over restricted networks, ensuring functional integrity.  
Furthermore, adherence to DoD data governance principles, such as Collective Data Stewardship \[28\], requires accountability throughout the data lifecycle. The system must ensure that the source data—including PLI and structured C2 messages—is timely and accurate before it is used for abstraction or logistics reporting \[3\].

#### **Integration with C2 and Reporting Data**

The EDMS architecture must be robust enough to handle structured C2 messaging (OPORDs, frag orders) alongside geospatial PLI. A crucial future requirement involves developing an EDMS interface capable of abstracting and aggregating critical status reports, such as LOGSTATs \[3\], generated by subordinate units. This abstracted reporting must be presented as simplified, echelon-appropriate indicators (e.g., color-coded status icons) for higher command posts, aligning with the operational decision support roles required at Battalion and Brigade level \[8\].

## **IV. Conclusions and Recommendations**

The implementation of echelon control in the TAK ecosystem mandates a fundamental architectural shift away from the legacy reliance on manual client-side filtering (FBCB2/JCR) towards a system of automated, centralized policy enforcement.  
The technical solution must be anchored in three core components:

1. **Identity Standardization:** Leveraging TAK Server’s enterprise integration capabilities (AD/LDAP) to enforce Attribute-Based Access Control (ABAC), thereby ensuring that data access and filtration policies are automatically governed by the user’s validated organizational echelon.
2. **Data Standardization:** Utilizing the Cursor-on-Target (CoT) schema, specifically the MIL-STD-2525 Symbol Identification Code (SIDC), as the programmatic key to determine the source unit's echelon and apply filtration and abstraction policies accurately.
3. **Architecture Layering:** Deploying a central **Echelon Data Management Service (EDMS)** on the TAK Server to execute the 2-Echelon Abstraction Rule and dynamic bandwidth throttling, complemented by the client-side **TAK Hierarchical Filter and Abstraction Plugin (TH-FAP)** to provide necessary manual override functionality and sophisticated scale-based visualization.

By adopting this blueprint, the TAK ecosystem can dynamically tailor the Common Operational Picture to the precise operational and cognitive requirements of every echelon, maximizing network efficiency while significantly improving the speed and quality of decision-making across the tactical environment.
