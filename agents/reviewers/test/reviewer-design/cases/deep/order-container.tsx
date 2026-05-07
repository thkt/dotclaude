import { useCallback, useState } from "react";
import { OrderDetail } from "./OrderDetail";
import { Spinner } from "./Spinner";
import { ErrorView } from "./ErrorView";
import { useOrder, useCancelOrder } from "./hooks";

interface Props {
  orderId: string;
  onCancelled?: () => void;
}

export function OrderContainer({ orderId, onCancelled }: Props) {
  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCancel = useCallback(() => {
    if (!order) return;
    if (order.status === "shipped") {
      alert("Shipped orders cannot be cancelled.");
      return;
    }
    setConfirmOpen(true);
  }, [order]);

  const handleConfirm = useCallback(() => {
    cancelOrder(orderId, {
      onSuccess: () => {
        setConfirmOpen(false);
        refetch();
        onCancelled?.();
      },
    });
  }, [orderId, cancelOrder, refetch, onCancelled]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorView err={error} onRetry={refetch} />;
  if (!order) return <ErrorView err={new Error("Order not found")} />;

  return (
    <OrderDetail
      order={order}
      isCancelling={isCancelling}
      confirmOpen={confirmOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      onCloseConfirm={() => setConfirmOpen(false)}
    />
  );
}
