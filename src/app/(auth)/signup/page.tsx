import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your workspace
        </p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
