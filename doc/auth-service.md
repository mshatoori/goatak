Implement an authentication service for the Goatak application.
Currently the application doesn't have any sort of authentication/authorization.

## What we need:

### Back-end:

The application should have an authentication service that provides API endpoints for login and refresh. It should be implemented as a separate docker container. Use Golang for it.
The authentication service should use JWT for authentication and provide API endpoints for login, but no registeration. The implementation should be quite basic, currently just user_name + password is enough. No need for name, email, etc.

The authentication service should have a database to store the users and their roles. The database should be a simple postgresql database.

The authentication service should have a simple API endpoint for login that returns 2 JWTs:

1. A short-lived JWT (15 minutes) for API authentication (Access Token, to be used in the Authorization header).
2. A long-lived JWT (1 month) for session management (Refresh Token, to be used in the cookies).

It shouldn't keep the password in the database as plain text.

All of the `webclient` API endpoints should use the Access Token for authentication. So, the webclient should have the public key of the authentication service to verify the Access Token.

The Refresh Token should be used to get a new Access Token when the Access Token expires.

### Front-end:

The application should start with a login page, and after successful login, the user should be able to see the main page (the map, sidebar, etc.)

Based on the role of the user, the application may show different options (for example, the admin may have access to change the data feeds while the regular user may not). What we need is not a full-blown authorization system, but rather a simple way to show/hide certain options based on the role of the user. It is important to document how could we could get the user's role in the front-end to change their options.

Using Axios, we should intercept the API requests and add the Access Token to the Authorization header.
Also we should intercept the API responses and check if the response is a 401 Unauthorized. If it is, and we have a Refresh Token, we should use it to get a new Access Token and retry the request. If we don't have a Refresh Token, we should redirect the user to the login page.
