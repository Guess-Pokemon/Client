import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { DarkModeProvider } from "../context/DarkModeContext";

export default function RootLayout() {
  return (
    <>
      <DarkModeProvider>
        <Navbar />
        <div
          className={`container-2xl w-full mt-16 min-w-[524px] min-h-screen overflow-y-auto`}
        >
          <Outlet />
        </div>
      </DarkModeProvider>
    </>
  );
}
