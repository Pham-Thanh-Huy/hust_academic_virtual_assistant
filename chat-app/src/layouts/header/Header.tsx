import { FiBell, FiMenu } from "react-icons/fi";

export const Header = ({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) => {
  return (
    <header className="flex items-center justify-between bg-white px-5 py-3 shadow-sm border-b border-gray-100">
      {/* Toggle Sidebar */}
      <button
        onClick={onToggleSidebar}
        className="group flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#9A001F] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#9A001F] hover:text-white hover:shadow-lg active:scale-95"
      >
        <FiMenu
          size={26}
          className="transition-transform duration-300 group-hover:rotate-180"
        />
      </button>

      {/* Logo */}
      <div>
        <img
          src="/hust-logo.svg"
          alt="HUST"
          className="h-12 w-12 object-contain"
        />
      </div>

      {/* Notification */}
      <button className="relative group flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#9A001F] shadow-sm transition-all duration-300 hover:bg-[#9A001F] hover:text-white hover:shadow-lg">
        {/* Ping */}
        <span className="absolute right-2 top-2 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600"></span>
        </span>

        {/* Bell */}
        <FiBell
          size={24}
          className="origin-top animate-[wiggle_1.4s_ease-in-out_infinite]"
        />
      </button>
    </header>
  );
};
