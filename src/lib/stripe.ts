import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily constructed so the app can still build/run without
 * STRIPE_SECRET_KEY set (e.g. in a dev environment that hasn't wired up
 * payments yet) — only portal payment code paths actually need this.
 */
export function getStripeClient(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set — portal payments aren't configured yet.");
    }
    client = new Stripe(key);
  }
  return client;
}
