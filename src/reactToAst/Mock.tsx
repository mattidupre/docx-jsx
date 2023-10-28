function MockChild(props: { name: string }) {
  return <h1>Hello {props.name}</h1>;
}

export function Mock() {
  return (
    <div>
      <MockChild name="world" />
    </div>
  );
}
