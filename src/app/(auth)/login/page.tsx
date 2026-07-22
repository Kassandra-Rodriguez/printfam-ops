import Link from "next/link";
import { LogInForm } from "./log-in-form";

export default function LogInPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back
        </p>
      </div>
      <LogInForm />
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </div>
  );
}
