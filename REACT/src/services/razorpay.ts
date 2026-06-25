declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      on?: (event: 'payment.failed', handler: (response: unknown) => void) => void;
      open: () => void;
    };
  }
}

export async function loadRazorpayCheckout() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout'));
    document.head.appendChild(script);
  });
}

function errorMessage(response: unknown) {
  const payload = response && typeof response === 'object' ? response as Record<string, unknown> : {};
  const error = payload.error && typeof payload.error === 'object' ? payload.error as Record<string, unknown> : payload;
  return String(error.description ?? error.reason ?? error.message ?? 'Razorpay payment failed');
}

export async function openRazorpayCheckout(options: Record<string, unknown>) {
  await loadRazorpayCheckout();
  if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable');
  const Razorpay = window.Razorpay;
  await new Promise<void>((resolve, reject) => {
    const providedHandler = typeof options.handler === 'function' ? options.handler as (result: unknown) => unknown : undefined;
    const modal = options.modal && typeof options.modal === 'object' ? options.modal as Record<string, unknown> : {};
    const providedDismiss = typeof modal.ondismiss === 'function' ? modal.ondismiss as () => unknown : undefined;

    const instance = new Razorpay({
      ...options,
      handler: async (result: unknown) => {
        try {
          if (providedHandler) await providedHandler(result);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ...modal,
        ondismiss: () => {
          providedDismiss?.();
          reject(new Error('Payment checkout was closed before completion'));
        },
      },
    });

    instance.on?.('payment.failed', (response: unknown) => {
      reject(new Error(errorMessage(response)));
    });
    instance.open();
  });
}

export async function openRazorpay(options: Record<string, unknown>) {
  await openRazorpayCheckout(options);
}
