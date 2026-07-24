interface Props {
  testo: string;
  classe: string;
}

export default function Badge({ testo, classe }: Props) {
  return <span className={`badge ${classe}`}>{testo}</span>;
}
