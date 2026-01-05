import { Routes, Route } from "react-router-dom";
import DeviceDetail from "./DeviceDetail";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<DeviceDetail />} />
      </Routes>
    </div>
  );
}

export default App;
