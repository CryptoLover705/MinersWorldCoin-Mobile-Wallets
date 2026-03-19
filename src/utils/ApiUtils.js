global.createSocketConnect = async () => {

  for (let server of ELECTRUM_SERVERS) {
    try {

      console.log("Trying Electrum:", server);

      global.socketConnect = new SocketUtil(server);
      await global.socketConnect.connect();

      console.log("Connected to Electrum:", server);
      global.connectionType = "electrum";

      return;

    } catch (err) {
      console.log("Electrum failed:", server);
    }
  }

  console.log("Electrum unavailable, switching to API");
  global.connectionType = "api";
};