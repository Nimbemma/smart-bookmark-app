"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    const setup = async () => {
      const { data } = await supabase.auth.getUser()
      const currentUser = data.user
      setUser(currentUser)

      if (currentUser) {
        fetchBookmarks(currentUser.id)

        const channel = supabase
          .channel("bookmarks-realtime")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookmarks",
              filter: `user_id=eq.${currentUser.id}`,
            },
            () => {
              fetchBookmarks(currentUser.id)
            }
          )
          .subscribe()
      }
    }

    setup()
  }, [])

  const fetchBookmarks = async (userId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    setBookmarks(data || [])
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBookmarks([])
  }

  const addBookmark = async () => {
    if (!title || !url) return

    await supabase.from("bookmarks").insert([
      {
        title,
        url,
        user_id: user.id,
      },
    ])

    setTitle("")
    setUrl("")
    fetchBookmarks(user.id)
  }

  const deleteBookmark = async (id: string) => {
    await supabase.from("bookmarks").delete().eq("id", id)
    fetchBookmarks(user.id)
  }

  // ✅ Tailwind-styled JSX starts here
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">📌 Smart Bookmark App</h1>

      {!user ? (
        <button
          onClick={handleLogin}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          Sign in with Google
        </button>
      ) : (
        <>
          <p className="mb-4">Welcome, {user.email}</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mb-6"
          >
            Logout
          </button>

          <div className="w-full max-w-md bg-white shadow-md rounded p-4 mb-6">
            <h2 className="text-xl font-semibold mb-2">Add Bookmark</h2>
            <input
              placeholder="Title"
              className="border p-2 w-full mb-2 rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              placeholder="URL"
              className="border p-2 w-full mb-2 rounded"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button
              onClick={addBookmark}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
            >
              Add
            </button>
          </div>

          <div className="w-full max-w-md bg-white shadow-md rounded p-4">
            <h2 className="text-xl font-semibold mb-2">Your Bookmarks</h2>
            <ul>
              {bookmarks.map((b) => (
                <li
                  key={b.id}
                  className="border-b py-2 flex justify-between items-center"
                >
                  <a
                    href={b.url}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    {b.title}
                  </a>
                  <button
                    onClick={() => deleteBookmark(b.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
