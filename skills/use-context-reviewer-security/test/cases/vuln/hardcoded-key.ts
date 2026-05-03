import Stripe from "stripe";

const STRIPE_KEY = "sk_live_PLACEHOLDER_DO_NOT_USE_FAKE_KEY";

export const stripe = new Stripe(STRIPE_KEY);
