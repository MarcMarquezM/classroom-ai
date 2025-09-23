import axios from "axios";

export default class API {
static port = process.env.NEXT_API_PORT;
static host = process.env.NEXT_API_HOST;

static url(path) {
    return `http://${this.host}:${this.port}/${path}`;
}

static async GET(path, token) {
    const url = this.url(path);
    const headers = { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": 80 };
    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error("GET request failed:", error);
        throw error;
    }
}

static async POST(path, body, token) {
    const url = this.url(path);
    const headers = { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": 80 };
    try {
        const response = await axios.post(url, body, { headers });
        return response.data;
    } catch (error) {
        console.error("POST request failed:", error);
        throw error;
    }
}

static async PUT(path, body, token) {
    const url = this.url(path);
    const headers = { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": 80 };
    try {
        const response = await axios.put(url, body, { headers });
        return response.data;
    } catch (error) {
        console.error("PUT request failed:", error);
        throw error;
    }
}

static async DELETE(path, token) {
    const url = this.url(path);
    const headers = { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": 80 };
    try {
        const response = await axios.delete(url, { headers });
        return response.data;
    } catch (error) {
        console.error("DELETE request failed:", error);
        throw error;
    }
}
}
