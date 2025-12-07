We want to refactor the way the project handles configurations.
Currently the config management is not centralized and there are different and maybe conflicting ways of reading the configs from database, the config files, env vars, etc. These configs are related to many different attributes:

1. Basic settings like `web_port`, `debug`, `no_web`, and `file`
2. Dependency settings like `server_address`, `gpsd`, and `dns_service.url`
3. User default settings, like the ones starting with `me` namespace
4. Flow settings
5. Sensor settings
6. Settings related to features, like tracking and resend

What we want to implement is to have a configuration manager that would handle the initiation and persistence of these settings (in the database).
Create a simple configuration manager in the `config.go` file. Don't integrate it into the project yet, we'll do that later.

The config manager should have serializable Config structure like `FlowConfig` and be able to create an instance of it from the config files /
