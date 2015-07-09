
# taco-remote

Build agent for the *remotebuild* server to build, run, and debug iOS apps created using Apache Cordova

*taco-remote* provides an HTTP API for submitting Apache Cordova build requests. It uses *taco-remote-multiplexer* to map a given build request to the most appropriate build agent. *taco-remote* then forwards the build request to a selected build agent (like *taco-remote-lib*)

