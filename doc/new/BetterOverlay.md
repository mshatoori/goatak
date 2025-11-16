Improve the current overlay based on the following description:

Overlay Manager sorts map objects into categories and subcategories.
Select the `لایه‌ها` button on the sidebar to bring up the list of categories. These include: Other nodes, Units, Alerts, Markers (points), Polygons, and Routes.
The Overlay Manager is shown in a tree view on the sidebar.
Selecting a category will open a detailed listing of the items available in that category. The available items within each category are annotated on the menu entry, allowing the user to reference sub-menu content.
When a displayed item in a specific category is selected, the map view will pan to that item.
Users may turn visibility of any category on and off through the checkboxes. An unchecked box corresponds to a category, along with its subcategories, as not visible.

This is the list of categories/subcategories:

1. Contacts: other nodes in the network. translated to مخاطبین. The corresponding items in sharedState.items have the condition `item.category == "contact"`
2. Units: translated to "نیروها". condition is `item.category == "unit"`. Should be subcategorized based on affiliation (`item.aff`).
3. Alarms: translated to "هشدارها". condition is `item.category == "alarm"`. Should be subcategorized based on type of alarm.
4. Points: translated to "نقاط". condition is `item.category == "point"`
5. Drawing (polygons): translated to "ناحیه‌ها". condition is `item.category == "drawing"`
6. Routes: translated to "مسیرها". condition is `item.category == "route"`
