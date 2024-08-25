const express = require("express");
const path = require("path");
const { google } = require("googleapis");
const { authorize } = require("./auth.js");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/lista-eventos", async (req, res) => {
  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: "v3", auth });

    const hoje = new Date();
    const comecoDoMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1
    ).toISOString();
    const fimDoMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0
    ).toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: comecoDoMes,
      timeMax: fimDoMes,
      singleEvents: true,
      orderBy: "startTime",
    });
    const eventos = response.data.items;
    if (!eventos || eventos.length === 0) {
      console.log("Não há eventos marcados");
      res.json([]);
      return;
    }
    res.json(eventos);
  } catch (error) {
    console.error("Erro em procurar eventos: ", error);
    res.status(500).json({ message: "Erro ao procurar eventos" });
  }
});

app.post("/api/criar-evento", async (req, res) => {
  const { dataInicio, dataFim, horaInicio, horaFim, nomeEvento } = req.body;

  try {
    const auth = await authorize();
    const calendar = google.calendar({ version: "v3", auth });
    // YYYY-MM-DD
    // HH:MM
    const inicioDataHora = `${dataInicio}T${horaInicio}:00`;
    const fimDataHora = `${dataFim}T${horaFim}:00`;

    const evento = {
      summary: nomeEvento,
      start: {
        dateTime: inicioDataHora,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: fimDataHora,
        timeZone: "America/Sao_Paulo",
      },
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: evento,
    });
    res.json({ message: "Evento criado com sucesso" });
  } catch (error) {
    console.log("Erro ao criar evento ", error);
    res.status(500).json({ message: "Erro ao criar evento" });
  }
});
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
