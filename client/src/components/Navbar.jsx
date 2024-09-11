import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login");
  };
  return (
    <nav className="bg-white dark:bg-gray-900 fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-800 h-16">
      <div className="max-w-screen-xl flex items-center justify-between mx-auto p-4 h-full">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Link to={"/"}>
            <img
              src="/logo whos-that-pokemon.png"
              className="h-8"
              alt="Pokemon Logo"
            />
          </Link>
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">
            Guess That Pokemon
          </span>
        </div>

        <div className="flex items-center space-x-3 md:space-x-0 rtl:space-x-reverse">
          {localStorage.getItem("username") && (
            <button
              type="button"
              className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-red-700 dark:hover:bg-red-700 dark:focus:ring-red-800"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
