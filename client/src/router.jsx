import { createBrowserRouter } from "react-router-dom";
import PokemonGuessingGame from "./pages/PokemonGuessingGame";
import Login from "./pages/Login";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PokemonGuessingGame />,
  },
  {
    path: "/login",
    element: <Login/>
  }
]);
