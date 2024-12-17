import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import React from 'react';

const HydrateAtoms = ({ initialValues, children }: any) => {
  // initialising on state with prop on render here
  useHydrateAtoms(initialValues);
  return children;
};

function AtomProvider({
  initialValues,
  children,
}: {
  initialValues: [any, any][];
  children: React.ReactNode;
}) {
  return (
    <Provider>
      <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
    </Provider>
  );
}

export default AtomProvider;
