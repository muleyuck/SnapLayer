import ImageUploader from "@/components/ImageUploader"

function App() {
  return (
    <div className="w-64 space-y-4 px-4 py-2 dark:bg-slate-800 dark:text-white">
      <h2 className="block w-48 dark:hidden">
        <img src="/logo-light.svg" alt="SnapLayer Logo Light" />
      </h2>
      <h2 className="hidden w-48 dark:block">
        <img src="/logo-dark.svg" alt="SnapLayer Logo Dark" />
      </h2>
      <ImageUploader />
    </div>
  )
}

export default App
