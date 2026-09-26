import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty">
      <h1>Race not found</h1>
      <p>This race is not in the saved benchmark.</p>
      <Link className="button" href="/">
        View results
      </Link>
    </section>
  );
}
