import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import Kanban from "./pages/Kanban";

export default function App() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Header />
        <Kanban />
      </div>
    </div>
  );
}