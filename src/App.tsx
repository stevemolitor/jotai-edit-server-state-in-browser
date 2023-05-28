import { ChangeEventHandler, Suspense } from "react";
import { atom, useAtom, useAtomValue } from "jotai";
import { atomFamily } from "jotai/utils";
import { useCallback } from "react";
import "./styles.css";

interface Order {
  name: string;
  price: number;
}

const ORDERS = {
  "1": { name: "apple", price: 1.99 },
  "2": { name: "banana", price: 2.99 },
};

type OrderId = keyof typeof ORDERS;

// fetch order from server
const fetchOrder = async (id: OrderId) =>
  new Promise<Order>((resolve) => {
    setTimeout(() => resolve(ORDERS[id]), 1000);
  });

// atom holding currently selected order id
const orderIdAtom = atom<OrderId>("1");

// atom family of orders fetched from server
const serverOrdersFamily = atomFamily((id: OrderId) =>
  atom(async () => fetchOrder(id))
);

// atom family of orders edited in browser
const clientOrdersFamily = atomFamily((_id: OrderId) =>
  atom<Order | undefined>(undefined)
);

// facade orders family that merges server and client edited order
const ordersFamily = atomFamily((id: OrderId) =>
  atom(
    (get) => {
      const clientOrder = get(clientOrdersFamily(id));
      if (clientOrder) {
        return clientOrder;
      }
      return get(serverOrdersFamily(id));
    },
    async (get, set, edit: Partial<Order>) => {
      const oldOrder = await get(ordersFamily(id));
      const newOrder = { ...oldOrder, ...edit };
      set(clientOrdersFamily(id), newOrder);
    }
  )
);

// form to let user edit an order in memory
const OrderForm = () => {
  const orderId = useAtomValue(orderIdAtom);
  const [order, setOrder] = useAtom(ordersFamily(orderId));

  const onChangeOrderName = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setOrder({ name: event.target.value });
    },
    [order, setOrder]
  );

  const onChangeOrderPrice = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setOrder({ price: event.target.valueAsNumber });
    },
    [order, setOrder]
  );

  return (
    <div>
      <h1>Order {orderId}:</h1>
      <div>
        <label htmlFor="name">name: </label>
        <input
          id="name"
          type="text"
          value={order.name}
          onChange={onChangeOrderName}
        />
      </div>
      <div>
        <label htmlFor="price">price: </label>
        <input
          id="price"
          type="number"
          value={order.price}
          onChange={onChangeOrderPrice}
        />
      </div>
    </div>
  );
};

// calculate and display the price with coupon discount
const OrderDiscount = () => {
  const orderId = useAtomValue(orderIdAtom);
  const { price } = useAtomValue(ordersFamily(orderId));
  const priceWithDiscount = (price * 0.9).toFixed(2);

  return (
    <div>
      <h1>Price with Coupon:</h1>
      {priceWithDiscount}
    </div>
  );
};

// order app
const App = () => {
  const [orderId, setOrderId] = useAtom(orderIdAtom);

  const selectOrder = useCallback(
    (event) => {
      setOrderId(event.target.value);
    },
    [setOrderId]
  );

  return (
    <div className="App">
      <h1>Select Order:</h1>
      <select value={orderId} onChange={selectOrder}>
        {Object.keys(ORDERS).map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <Suspense fallback={<div>loading order…</div>}>
        <OrderForm />
        <OrderDiscount />
      </Suspense>
    </div>
  );
};

export default App;
