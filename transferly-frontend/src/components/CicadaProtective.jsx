import cicadaLeft from '../assets/cicada-left.png';
import cicadaBody from '../assets/cicada-body.png';
import cicadaRight from '../assets/cicada-right.png';
import './CicadaProtective.css';

export default function CicadaProtective({ protect = false, size = 250 }) {
  const width  = size;
  const height = Math.round(size * 0.8);

  return (
    <div
      className="cicada-protective"
      style={{ width, height }}
    >
      <img src={cicadaLeft}  className="wing wing-left"  alt="" draggable={false} />
      <img src={cicadaBody}  className="body"           alt="" draggable={false} />
      <img src={cicadaRight} className="wing wing-right" alt="" draggable={false} />
    </div>
  );
}
