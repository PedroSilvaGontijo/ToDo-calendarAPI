const request = require("supertest");
const express = require("express");
const path = require("path");
const { google } = require("googleapis");
const { authorize } = require("../auth");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

jest.mock("../auth");
jest.mock("googleapis", () => {
  const mockCalendar = {
    events: {
      list: jest.fn(),
      insert: jest.fn(),
    },
  };
  return { google: { calendar: () => mockCalendar } };
});

const calendar = google.calendar();

app.get("/api/lista-eventos", async (req, res) => {
  try {
    const auth = await authorize();
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      timeMax: new Date(
        new Date().setMonth(new Date().getMonth() + 1)
      ).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    const eventos = response.data.items;
    if (!eventos || eventos.length === 0) {
      return res.json({ message: "Não há eventos marcados" });
    }
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: "Erro em procurar eventos" });
  }
});

app.post("/api/criar-evento", async (req, res) => {
  const { dataInicio, dataFim, horaInicio, horaFim, nomeEvento } = req.body;

  try {
    const auth = await authorize();
    const evento = {
      summary: nomeEvento,
      start: {
        dateTime: `${dataInicio}T${horaInicio}:00`,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: `${dataFim}T${horaFim}:00`,
        timeZone: "America/Sao_Paulo",
      },
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: evento,
    });
    res.json({
      message: "Evento criado com sucesso",
      link: response.data.htmlLink,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar evento" });
  }
});

describe("Testa API do Google Calendar", () => {
  it("deve listar eventos do mês atual", async () => {
    calendar.events.list.mockResolvedValueOnce({
      data: {
        items: [
          {
            start: {
              dateTime: "2024-09-01T09:00:00",
              timeZone: "America/Sao_Paulo",
            },
            summary: "Reunião de Planejamento",
          },
        ],
      },
    });

    const response = await request(app).get("/api/lista-eventos");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].summary).toBe("Reunião de Planejamento");
  });

  it("deve criar um novo evento", async () => {
    calendar.events.insert.mockResolvedValueOnce({
      data: {
        htmlLink: "http://example.com",
      },
    });

    const response = await request(app).post("/api/criar-evento").send({
      dataInicio: "2024-09-01",
      horaInicio: "09:00",
      dataFim: "2024-09-01",
      horaFim: "11:00",
      nomeEvento: "Reunião de Planejamento",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Evento criado com sucesso");
    expect(response.body.link).toBe("http://example.com");
  });
});
