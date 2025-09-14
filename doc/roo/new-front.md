This project is an attempt to create a TAK client, similar to ATAK, that uses Go as the programming language. It has a front-end, that is currently handled in a very bad way!
The entry-point of the front end is the HTML files in the `cmd/webclient/templates`. These files load the static files of the project, that are in the `staticfiles/static`. Also in there, you could find `architecture_summary.md` that describe the front end in a little bit more details.

What you need to do, is to read every part of this front-end implementation, and provide a plan for creating a new front-end project that matches the capabilities on this one perfectly, without any changes to the functionality whatsoever. The new project should be using Vue3 instead of Vue2, replace bootstrap with Vuetify, and use a decent build system, to decouple the back-end from the front-end.

You only should provide a plan. Do not implement anything yet.

The plan should be incremental, and each phase of it should be usable. For example, a good goal for phase 1 could be implementing only the map and showing the position of user on the map, without any of the other features present.

Write the plan in MarkDown format in a file.
