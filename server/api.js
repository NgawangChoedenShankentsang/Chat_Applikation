const hello = (req, res) => {
  res.send("Hello World!");
};

const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Überprüfen, ob Benutzer bereits vorhanden ist
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).send({ message: "Benutzer bereits vorhanden" });
    }
    // Benutzer in der Datenbank speichern
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword });
    return res.status(201).send({ message: "Benutzer erfolgreich registriert" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Interner Serverfehler" });
  }
};

const initializeAPI = (app) => {
  // Default REST-API-Endpunkt
  app.get("/api/hello", hello);

  // Benutzerregistrierungsendpunkt
  app.post("/api/register", registerUser);
};

module.exports = { initializeAPI };