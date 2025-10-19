# **Comprehensive Report: Echelon-Driven Data Governance and Visualization for Situational Awareness in the TAK Ecosystem**

## **Executive Summary**

This comprehensive report synthesizes findings from analyses of both legacy situational awareness (SA) systems and the Team Awareness Kit (TAK) ecosystem, focusing on the critical role of military command hierarchy (echelon) in managing information flow, reducing cognitive load, and optimizing decision-making on the battlefield. Legacy systems such as FBCB2/JCR, JBC-P, and Nett Warrior established foundational necessities for echelon-based data filtering and abstraction. These principles are then extended to propose a robust, automated framework for the TAK ecosystem. The proposed solution includes encoding unit hierarchy within Cursor-on-Target (CoT) messages, implementing server-side policy enforcement through an Echelon Data Management Service (EDMS), and providing flexible client-side visualization via a TAK Hierarchical Filter and Abstraction Plugin (TH-FAP). The overarching goal is to dynamically tailor the Common Operational Picture (COP) to the precise operational and cognitive requirements of each echelon, thereby maximizing network efficiency and enhancing the speed and quality of decision-making.

## **I. Echelon Incorporation in Legacy Situational Awareness (SA) Systems**

Modern military SA systems are meticulously designed to reflect the chain of command, utilizing force hierarchies (echelons) to customize information display and data flow for each user’s specific role. This prevents information overload at lower echelons while ensuring higher commanders maintain a comprehensive strategic and operational overview. Key operational aspects observed in these legacy systems include:

### **A. Operational Context and Foundational Principles of SA Management**

1.  **Cognitive Load Management and Decision Support:** SA systems are fundamentally designed to facilitate the triad of perception, comprehension, and projection of the battlefield environment. The exponential increase in data from sensors and real-time Position Location Information (PLI) necessitates stringent data filtering and abstraction. Uncontrolled data transmission results in information overload, degrading human comprehension and impairing decision-making. Echelon-based management is thus crucial for reducing the breadth and complexity of the Information Environment (IE) and producing actionable intelligence. Effective Command and Control (C2) relies on abstracting complex tactical and logistical information, ensuring commanders receive synthesized analysis and recommendations rather than raw data. The goal is to rigorously enforce the doctrinal principle of "need-to-know" or "need-to-see," aligning information with the Commander's Critical Information Requirements (CCIR).

### **B. Operational Use of Legacy Systems Across Echelons (Brigade to Platoon)**

The utility and purpose of SA systems vary significantly based on the command echelon they support:

1.  **Higher Echelons and Abstraction:** At Battalion, Brigade, and higher command levels, systems like JBC-P and FBCB2 were primarily used for macro-level battle observation, real-time feedback, and executing C2 functions for decisive operations. These command post environments require a comprehensive COP optimized for operational and tactical decision-making. Higher echelons typically rely on systems designed for abstraction, such as the Joint Tactical Common Operational Picture Workstation (JTCW), which integrates data feeds into a format conducive to staff planning and command decisions.
2.  **Lower Echelons and Close-Fight SA:** Conversely, lower echelons (platoon and company) rely on SA during planning, preparation, and real-time close-fight monitoring, especially in low-visibility or dynamic operations. Primary functions include fratricide mitigation, detailed land navigation, and local message reporting. Nett Warrior (NW), a soldier-worn mission command system, provided immediate SA and internal communications for the dismounted leader, bridging the gap between vehicle-mounted systems (JBC-P) and individual soldiers.

### **C. Architecture of Echelon-Awareness in Legacy Systems**

1.  **Unit Visibility Filtering:** SA systems restrict or filter the view of the battlefield based on a unit’s echelon and context. For instance, the U.S. Army’s FBCB2 was designed so that each echelon sees the COP roughly “two echelons up and down and one adjacent unit left and right.” This focuses the display on relevant forces, reducing clutter and cognitive load. Modern Battlefield Management Systems (BMS) like the French SCORPION/SICS or Danish SitaWare similarly optimize views, providing junior leaders with detailed but limited information and senior commanders with broader overviews.
2.  **Hierarchical Map Representations:** Command hierarchy is visually encoded. MIL-STD-2525 symbology marks unit icons with echelon indicators (e.g., one dot for squad, XX for battalion). Higher echelon commanders can toggle map layers (e.g., viewing only platoon leaders’ icons) to declutter the map. FBCB2/JCR managed map overlays per echelon and staff function, distributing relevant control measures upwards or downwards as needed. This layered approach ensures subordinates receive only necessary information.
3.  **Message Routing and Delivery:** Hierarchical message routing is a core design feature. Messages in FBCB2/JCR are addressed to specific roles or units, not broadly broadcast. A typical doctrine ensures reports from lower units go to their higher headquarters and relevant adjacent units. For example, a SPOT report generates an icon visible to all, but only addressed recipients receive the detailed text. This ensures critical information reaches the chain of command without inundating others.
4.  **Access Control and Permissions:** Many SA systems implement access controls aligned with hierarchy and security. Users are associated with a unit and echelon, governing what they *should* see. JCR introduced NSA Type 1 encryption for classified networks, effectively separating feeds by echelon (e.g., SECRET for battalion and above, SBU for company and below). Coalition operations, such as those on CENTRIXS, involved strict filtering of data shared between nations. Modern BMS architectures are trending towards individual user identity and role-based accounts.
5.  **User Interface Tailored to Echelon:** UI complexity and available functions often vary by echelon. Nett Warrior, a smartphone-based tool for dismounted leaders, prioritizes quick, local SA. In contrast, brigade or division TOC systems (like CPOF) display multiple data layers and analytic tools. UI may offer mode switches or filters for different roles, ensuring junior leaders receive what they need for their immediate fight, while senior leaders maintain oversight.
6.  **FBCB2/JCR Manual Filtering:** Legacy systems like FBCB2 and JCR relied on client-side manual filtering, where users defined criteria such as unit types, echelons, and data age. This manual approach, however, was prone to inconsistency, human error, and failure to adjust during dynamic mission phases, potentially degrading the COP. The use of sophisticated, dedicated COP interfaces for higher echelons like the JTCW highlights the need for pre-processed, abstracted views. This underscores the necessity for transitioning to server-side automated policy enforcement in the TAK ecosystem.
7.  **Nett Warrior and Network Echelon Segmentation:** Nett Warrior's effectiveness lessons reveal network constraints and echelon limits. Its functionality degraded at the company level due to Manpack radio network limitations. Connectivity to higher-echelon JBC-P systems was achieved through Tactical Services Gateways (TSG), which acted as network bridges between lower-bandwidth (SRW) and higher-bandwidth (Upper Tactical Internet) networks. This architecture demonstrates that the network transition point between echelons is the ideal location to enforce data filtering, throttling, and abstraction policies *before* data reaches the next command level.

## **II. Technical Foundation: Data Encoding and Standardization for TAK**

Effective automated echelon control in TAK requires a standardized means of identifying the position, affiliation, and unit hierarchy of every entity. This is achieved through the integration of the Cursor-on-Target (CoT) data standard with military symbology protocols.

### **A. Data Modeling for Hierarchy: Cursor-on-Target (CoT)**

CoT is the standardized XML-based schema used across the Department of Defense (DoD) for exchanging time-sensitive position and event data. It acts as the technical lingua franca for interoperability within the TAK ecosystem. The core CoT schema, with its twelve mandatory tags, inherently supports hierarchy and privileges, establishing a foundational mechanism for authorization and context.

1.  **Encoding Unit Hierarchy in CoT Messages:** While CoT supports basic categorization (e.g., `type` field for MIL-STD-2525 symbol codes), it can be explicitly extended to carry unit hierarchy information. This can be achieved using CoT "detail" fields or an optional schema extension to include unit identifiers, echelon, and potentially parent unit. For example, a custom `<unit>` tag (e.g., `<unit name="1PLT A Co/1-23IN" echelon="Platoon" parentUID="A Co/1-23IN"/>`) could be embedded within the CoT event's detail. This metadata would travel with CoT location reports, providing receivers with the sender’s unit context. Legacy systems like FBCB2 JCR's Self-Descriptive Situational Awareness (SDSA) broadcast each platform’s Unit Reference Number (URN), role, and other identifiers, allowing devices to dynamically build an address book. TAK could emulate this, with clients sending a CoT event advertising "callsign" and unit hierarchy. The CoT protocol is extensible, allowing for additional components in the `type` field or `detail` for machine filtering. Adhering to MIL-STD-2525 symbol codes already denotes echelon in ATAK iconography, but explicit unit grouping data is needed for true hierarchical leverage. A concrete recommendation is to adopt a naming scheme or CoT **UID convention** that encodes hierarchy (e.g., GUID prefixed by unit code), or a separate CoT event type to outline the task organization. This would enable expanding subordinate elements by tapping on a higher unit icon or filtering all CoT events by a unit tree.

### **B. Encoding Echelon via CoT type and MIL-STD-2525**

The organizational identity of a unit or platform is encoded within the CoT message's `type` attribute, which defines "what the event is about." For military systems, the `type` field utilizes the Symbol Identification Code (SIDC) derived from MIL-STD-2525, which specifies symbols for graphical displays in C4I systems. The SIDC is a 15-character alphanumeric identifier that provides the minimum elements needed to construct a tactical symbol. Critical elements within the SIDC, particularly in the "Atoms" portion of the type tree, include the entity's affiliation (e.g., friendly, hostile, neutral) and its echelon or unit size. The SIDC, delivered via the CoT `type` field, is the only standardized, system-agnostic technical means for the TAK Server and connected clients to programmatically determine the exact echelon, affiliation, and function of any entity. Therefore, policy implementation in the TAK ecosystem must rely entirely on accurately parsing and utilizing the SIDC to link a geospatial position report to a defined unit hierarchy level.

The relationship between SIDC components and echelon data is conceptually summarized as follows:

| SIDC Position/Field             | Description                                                             | Relevance to Echelon Filtering                                                                         | Actionable TAK Use Case                                                                                   |
| :------------------------------ | :---------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| Position 3 (Affiliation)        | Defines allegiance (Friendly, Hostile)                                  | Determines display parameters and access rules (e.g., PLI only for friendly forces)                     | Client filter for displaying blue forces                                                                  |
| Position 11 (Echelon/Unit Size) | Defines the command level (Squad, Platoon, Company, Battalion, Brigade) | Primary key for Server-Side Abstraction and Throttling policies.                                       | Server dynamically aggregates PLI icons based on this value for higher-echelon users.                       |
| CoT `<detail>` Extension        | Additional, non-2525 data (e.g., callsign, unit assignment)             | Used for granular user-defined filtering and Attribute-Based Access Control (ABAC) policy enforcement. | TAK Server group membership rule (e.g., _If CoT detail attribute matches unit, assign to Unit Group_) |

### **C. TAK Ecosystem Architecture for Hierarchy Management**

The TAK ecosystem, especially the TAK Server, provides the necessary infrastructure to automate echelon policy management through robust user administration and enterprise integration.

1.  **Attribute-Based Access Control (ABAC) Foundation via TAK Server:** TAK Server supports centralized data management and real-time updates through user, group, and role management, either locally or via integration with enterprise services like Active Directory (AD) or LDAP. This enables ABAC, where user attributes (e.g., organizational structure code, rank) define group membership via Group Rules. This is a significant architectural advantage over manual filtering in legacy systems, allowing for automatic application of predetermined, doctrinally compliant filters and abstraction policies. By linking a user's authenticated organizational attribute to a TAK Group rule, data flow policy becomes governed, auditable, and dynamically enforced, ensuring the correct echelon view by default.
2.  **Hierarchy-Based User Roles and Permissions:** TAK Server's user, group, and role capabilities can be aligned with military roles (e.g., Team Member, Platoon Leader, Company Commander). These roles should be granted permissions consistent with their information needs, such as restricting a Team Member's view to simulate need-to-know, while a Commander can view all friendly tracks. Organizational groups can be created per unit, with data-sharing rules managed by "ingress/egress" settings. This configuration replicates hierarchy-based access control, allowing, for example, a Company group to only receive CoT from its platoons, while a Battalion group receives from all companies. The TAK Server admin GUI's "Group In/Out filter" feature simplifies this selective dissemination. Role-based permissions can also control features, allowing higher-role users to inject tasks or markers that subordinates cannot delete or see if not addressed to them. Integration with directory services (LDAP/Active Directory) facilitates managing these roles at scale, ensuring the principle of "right info to the right echelon" is maintained.

## **III. Comprehensive Design Document for TAK Echelon Implementation**

This section outlines the architectural blueprint for implementing automated, echelon-based data flow control and visualization within the TAK ecosystem.

### **A. Echelon Definition and Server-Side Policy Design**

1.  **Defining the TAK Echelon Attribute (TEA) Schema:** To enforce policy, a standardized attribute structure, the TAK Echelon Attribute (TEA) schema, must be defined, derived from enterprise identity services (AD/LDAP). The TEA defines a user's authoritative place in the command hierarchy.

    *   **Core TEA Fields:**
        *   **TEA-ID:** Unique TAK Server identifier, linked to the user's certificate Common Name.
        *   **TEA-Command_Echelon:** The doctrinally defined command level (e.g., Squad, Platoon, Company, Battalion, Brigade).
        *   **TEA-O-Group:** The specific unit designation (e.g., 2nd Brigade, 1st Armored Division, or 2-1 AD).
        *   **TEA-Role:** Functional role within the unit (e.g., Commander, S-3, Medic).
        *   **TEA-Max_View_Distance:** Defines the default geospatial boundary for raw PLI display (e.g., 5 km for a Platoon Leader, 25 km for a Battalion Commander).

    The process involves AD/LDAP synchronization populating user profiles, a Group Rule trigger automatically assigning the user to a specific TAK Echelon Group, and the EDMS applying group-specific policies based on that assignment.

2.  **Design Blueprint 1: Server-Side Data Flow Control via EDMS:** The primary mechanism for enforcing echelon policy is the **Echelon Data Management Service (EDMS)**, a core TAK Server plugin or module responsible for dynamically filtering, aggregating, and distributing CoT data based on the recipient's TEA and the originator’s SIDC.

    *   **Policy 1: Throttling and Selective Distribution:** The EDMS maximizes network efficiency and prevents data saturation on low-bandwidth tactical networks.
        *   **Raw PLI Limit:** High-frequency, raw PLI messages are only multicast to the immediate organic group and adjacent elements (e.g., Squad and Platoon HQ), preserving bandwidth.
        *   **Higher Echelon Subscription:** Higher echelons (Battalion and above) subscribe only to EDMS-processed aggregated data streams, not raw, individual PLI feeds.
    *   **Policy 2: Abstraction and Aggregation Logic (The 2-Echelon Rule):** To manage cognitive load, the EDMS enforces abstraction by aggregating lower-echelon CoT messages into simplified, symbolic markers for higher command levels. Doctrinally, commanders require high fidelity for their own echelon and the echelon immediately below, with subsequent echelons abstracted.
        *   **Rule:** If a user’s TEA-Command_Echelon is $N$, the EDMS transmits individual PLI (raw CoT) only for entities within echelon $N$ and $N-1$. Entities at echelon $N-2$ and below are presented as a single, abstracted icon.
        *   **Aggregation:** Abstraction is performed by dynamically calculating the location and boundary of the aggregated icon (e.g., a Company marker), which can be the Centroid of all subordinate PLI or the position of the designated Command Post.

    The following matrix dictates the default data flow controls enforced by the EDMS:

    | User Echelon              | TEA-ID        | Data Subscription Scope (Default)                         | Abstraction Policy Applied                                      | Bandwidth Optimization                                               |
    | :------------------------ | :------------ | :-------------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------------------- |
    | Dismounted Leader (E-1)   | SQD/Fire Team | Raw PLI (organic squad/platoon)                           | None (High fidelity required for immediate vicinity)            | Aggressive throttling based on network limits                        |
    | Platoon Leader (E-2)      | PLT HQ        | Raw PLI (organic PLT), Aggregated Icon (next higher COY)  | None (High fidelity for close fight)                            | Prioritize PLI delivery; filter non-essential C2 data                |
    | Company Commander (E-3)   | COY HQ        | Raw PLI (PLT HQ key assets), Aggregated Icons (all PLTs)  | Apply 2-Echelon Rule for E-1 (Squad) PLI aggregation            | Intermediate throttling; control streaming video/large file transfer |
    | Battalion Commander (E-4) | BN HQ         | Aggregated Icons (all organic COYs/PLTs), Raw C2 Messages | Apply 2-Echelon Rule for E-2 (PLT) PLI aggregation              | Focus on C2 data, LOGSTAT reports, and operational boundaries        |
    | Brigade Commander (E-5)   | BDE HQ        | Aggregated Icons (all organic BNs), C2 HQs                | High abstraction (Aggregated BN icons, minimal lower PLI)       | Minimum PLI updates; prioritize macro SA and status reporting        |

3.  **Echelon-Based Filtering of Tracks and Events:** Both client and server sides should implement echelon-based filtering. On ATAK/WinTAK, users could filter map displays to show only certain echelons (e.g., "show platoon leaders only," hiding individual soldiers). This requires CoT events to carry echelon labels or use a naming convention. Utilizing 2525 symbology for SIDC allows the client to natively distinguish echelons. On the server side, feed filtering is crucial for bandwidth. This can be achieved through separate topic channels for echelons, running multiple TAK servers or logical federations (e.g., company servers feeding upwards to a battalion server), or using the current TAK Server's Group In/Out filter feature to manage selective data dissemination. This prunes each echelon’s COP, reducing cognitive overload and saving bandwidth.

4.  **Data Dissemination Paths and Feed Configuration per Role:** An echelon-aware architecture requires intentionally designing data dissemination paths.
    *   **Hierarchical Feed Topology:** Organize TAK connectivity in a tree (or hub-and-spoke) topology mirroring unit hierarchy, deploying TAK servers at brigade, battalion, and company levels. Company servers handle local traffic and feed necessary information upwards to battalion servers, which then feed brigade. Federation or TAK Broker can selectively forward CoT events.
    *   **Per-Role Data Logic:** Use CoT event types or fields to indicate message priority or intended audience (e.g., urgent MEDEVAC requests broadcast to all echelons, routine updates kept within org unless explicitly requested). Custom plugins could route messages based on such tags.
    *   **Leveraging Group Hierarchies:** Utilize TAK Server's nested organizations to mirror military hierarchy. Higher-level groups can subscribe to all sub-group traffic, while sub-groups do not see lateral traffic, automatically providing hierarchical feeds. "Org admin" roles and publish permissions allow higher HQ to inject data into subordinates’ feeds. TAK Server's admin UI now facilitates setting per-group data flow rules.
    *   **Summaries and Aggregation:** Implement aggregation at echelon boundaries (e.g., battalion server aggregating 40 individual platoon markers into a single battalion-level marker for the brigade view). This could be done via a server-side script or plugin producing bounding boxes or representative icons, aligning with military practice of reporting unit locations by headquarters element at higher echelons.

### **B. Client-Side Visualization and User Experience Design**

The client-side design translates server-side policy and SIDC data into an optimized visual display aligned with the user's operational scope.

1.  **Design Blueprint 2: Echelon-Dependent Visualization:** The most intuitive method for visual echelon management dynamically links data density and symbol detail to map scale, consistent with cartographic principles.

    *   **Automated Symbology Detail:** The TAK Client must use the parsed CoT SIDC Echelon element to dynamically adjust symbol complexity based on the map scale:
        *   **Zoomed In (Large Scale, Tactical View):** When map scale is $\\leq 25,000$, the client displays full MIL-STD-2525 SIDC symbol detail, individual PLI icons, and vector movement (required for dismounted leaders for fratricide mitigation and close navigation).
        *   **Zoomed Out (Small Scale, Operational View):** When map scale exceeds $100,000$, the client automatically implements scale-based symbol classes, displaying simplified, aggregated icons and suppressing or hiding lower-echelon PLI layers entirely. This reduces visual density and prevents clutter at strategic scales.

2.  **Recommendation: The TAK Hierarchical Filter and Abstraction Plugin (TH-FAP):** While EDMS enforces default doctrinal policies, users need flexibility to override settings, a critical capability in legacy systems. The TH-FAP provides this client-side control.

    *   **Required TH-FAP Functionality:**
        *   **Manual Override Filter:** Allow users to manually enable/disable layers based on unit type, affiliation, and data age.
        *   **Interest Group Definition:** Enable users to define "interest groups" (e.g., adjacent Company, key supporting asset) to temporarily receive higher-fidelity raw PLI, overriding EDMS policies.
        *   **Visualization Toggle:** Allow users, with appropriate credentials, to toggle between the default "Aggregated View" (EDMS policy-driven) and a "Raw PLI View" for specific monitoring tasks.

    The client-side visualization must follow the below rules:

    | User Echelon        | Map Scale Range (Denominator) | Visible SA Data Layer (Default)                                             | Symbolization Type                                               | Display Abstraction Level                     |
    | :------------------ | :---------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------- |
    | Platoon Leader      | $\\leq 25,000$                | Raw Individual PLI, Key Vehicle Icons, Own Group Track                      | Full MIL-STD-2525 SIDC Iconography                               | High Detail (Individual Movement)             |
    | Company Commander   | $25,001$ to $100,000$         | Aggregated Platoon Icons, Key Vehicle PLI (limited range), Adjacent Unit HQ | Standard MIL-STD-2525 Unit Symbols                               | Mixed Detail (Focus on PLT-level groups)      |
    | Battalion Commander | $100,001$ to $500,000$        | Aggregated Company/Platoon Icons, Boundary Overlays (AoO)                   | Standard MIL-STD-2525 BATTALION/COMPANY symbols                  | High Abstraction (Operational Picture)        |
    | Brigade Commander   | $\> 500,000$                  | Aggregated Battalion/BDE Icons, C2 HQ Locations, LOGSTAT Indicators         | Simplified/Scale-Based Symbology (Reduced Visual Density)        | Macro View (Strategic Synchronization)        |

### **C. Implementation Roadmap and Future Considerations**

1.  **Phased Integration:** Implementation should follow a structured approach:
    *   **Phase 1 (Foundation):** Establish AD/LDAP synchronization and fully define TAK Echelon Groups using Group Rules. Verify all transmitting CoT systems embed accurate SIDC data (Echelon/Affiliation).
    *   **Phase 2 (Server-Side Control):** Deploy the Echelon Data Management Service (EDMS) plugin to the TAK Server. Implement core policies: Throttling (Policy 1) and the 2-Echelon Abstraction Rule (Policy 2). This phase must include rigorous performance testing.
    *   **Phase 3 (Client-Side UX):** Develop and field the TAK Hierarchical Filter and Abstraction Plugin (TH-FAP), ensuring seamless integration with standard ATAK functionality. Implement scale-based symbology changes and ensure user authentication dictates default policy application.

2.  **Network Performance and Data Integrity:** The design must proactively address reliability challenges and dynamically manage bandwidth by adjusting PLI update rates over restricted networks. Adherence to DoD data governance principles, such as Collective Data Stewardship, requires accountability for timely and accurate source data before abstraction or logistics reporting.

3.  **Integration with C2 and Reporting Data:** The EDMS architecture must handle structured C2 messaging (OPORDs, frag orders) alongside geospatial PLI. A crucial future requirement involves developing an EDMS interface capable of abstracting and aggregating critical status reports (e.g., LOGSTATs) from subordinate units, presenting them as simplified, echelon-appropriate indicators for higher command posts.

## **IV. Conclusions and Recommendations**

The implementation of echelon control in the TAK ecosystem necessitates a fundamental architectural shift from manual client-side filtering (legacy FBCB2/JCR) to automated, centralized policy enforcement. This technical solution must be anchored in three core components:

1.  **Identity Standardization:** Leveraging TAK Server’s enterprise integration capabilities (AD/LDAP) to enforce Attribute-Based Access Control (ABAC), thereby ensuring that data access and filtration policies are automatically governed by the user’s validated organizational echelon.
2.  **Data Standardization:** Utilizing the Cursor-on-Target (CoT) schema, specifically the MIL-STD-2525 Symbol Identification Code (SIDC), as the programmatic key to determine the source unit's echelon and apply filtration and abstraction policies accurately.
3.  **Architecture Layering:** Deploying a central **Echelon Data Management Service (EDMS)** on the TAK Server to execute the 2-Echelon Abstraction Rule and dynamic bandwidth throttling, complemented by the client-side **TAK Hierarchical Filter and Abstraction Plugin (TH-FAP)** to provide necessary manual override functionality and sophisticated scale-based visualization.

By adopting this blueprint, the TAK ecosystem can dynamically tailor the Common Operational Picture to the precise operational and cognitive requirements of every echelon, maximizing network efficiency while significantly improving the speed and quality of decision-making across the tactical environment.

## **References and Examples**

*   U.S. Army FM 3-21.21 Appendix B (SBCT Infantry Battalion) – describes FBCB2 capabilities to show two levels up/down and adjacent units and the use of address groups for routing digital reports.
*   **FBCB2/JCR User Guides** – document the transition to SDSA dynamic data sets, broadcasting unit info like role name and URN to all nodes, which informs our approach to unit metadata in CoT.
*   **European BMS (Tamir Eshel, 2023)** – notes the design goal of filtering information for junior vs. senior commanders and tailoring displays per level, reinforcing the value of echelon filters in UI.
*   **Reddit ATAK Community Q&A** – offers practical insight that implementing hierarchy can be done via separate servers or built-in group filters on TAK Server, advice which our TAK configuration recommendations follow.
*   **TORCH-X and others** – demonstrated multi-echelon configurations (from division to platoon) with specialized applications for each level, serving as a successful example that TAK could emulate by plugin or configuration for different role devices (e.g., an ATAK plugin for higher HQ functions).

By learning from these sources and doctrines, developers and integrators of the TAK ecosystem can create a truly echelon-aware situational awareness network – one that scales information and access according to the chain of command, just as legacy military SA systems have done, but with the flexibility and interoperability that modern CoT/TAK technology provides.