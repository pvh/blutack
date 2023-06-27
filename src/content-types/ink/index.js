const { useDocument } = Blutack

export default function Widget(props) {
  const [doc, changeDoc] = useDocument(props.documentId)

  const { useState, useEffect } = React
  const ref = React.useRef()
  
  const [ctx, setCtx] = useState()
  
  const Vec = (x = 0, y = 0) => {
    return { x, y };
  };
  Vec.dist = (a, b) => {
    return Vec.len(Vec.sub(a, b));
  };
  Vec.sub = (a, b) => {
    return Vec(a.x - b.x, a.y - b.y);
  };
  Vec.len = (v) => {
    return Math.sqrt(Vec.dot(v, v));
  };
  Vec.dot = (a, b) => {
    return a.x * b.x + a.y * b.y;
  };
  Vec.fromEvent = (event) => {
    var bounds = event.target.getBoundingClientRect();
    
    var x = event.clientX - bounds.x;
    var y = event.clientY - bounds.y;
    return Vec(x, y)
  }

  const [eraseMode, setEraseMode] = useState(false);

  React.useEffect(() => {
    const ctx = initCanvas(ref.current);
    setCtx(ctx)
  }, [ref.current])
  
  // automerge updates
  React.useEffect(() => {
    if (!ctx) { return }
    if (!doc) { return }
    
    if (!doc.strokes) {
      // switch to this conditional to reset the drawing
      // if (doc.strokes.length > 0) {
      changeDoc(doc => doc.strokes = [])
    }

    // render any time we get a new document
    render(ctx, doc.strokes);
  }, [ctx, doc]) 
  
  function onMouseDown(e) {
    const pos = Vec.fromEvent(e)
    
    if (Vec.dist(pos, Vec(10, 25)) < 50) {
      setEraseMode(true)
    } else if (eraseMode) {
      erase(pos);
    } else {
      startStroke(pos);
    }
  }
  
  function onMouseMove(e) {
    const pos = Vec.fromEvent(e)
    
    if (!e.buttons) {
      return;
    } else if (eraseMode) {
      erase(pos);
    } else {
      extendStroke(pos);
    }
  }
  
  function onTouchStart(e) {
    for (const touch of e.touches) {
      if (touch.touchType === 'stylus') {
        onMouseDown(VecWithForce(touch.clientX, touch.clientY, touch.force));
      }
    }
  }
  
  function onTouchMove(e) {
    for (const touch of e.touches) {
      if (touch.touchType === 'stylus') {
        onMouseMove(VecWithForce(touch.clientX, touch.clientY, touch.force));
      }
    }
  }
  
  function VecWithForce(x, y, force) {
    const v = Vec(x, y);
    v.force = force;
    return v;
  }
  
  // strokes  
  function startStroke(pos) {
    changeDoc(d => {
      d.strokes.push([pos])})
  }
  
  function extendStroke(pos) {
    changeDoc(d => {
      d.strokes[doc.strokes.length-1].push(pos)
    })
    
  }
  
  // canvas and rendering
  function initCanvas(canvas) {
    const dpr = window.devicePixelRatio;
    const dom = document.body;
    let bounds = dom.getBoundingClientRect();
    canvas.width = 1000 // bounds.width * dpr;
    canvas.height = 600 // bounds.height * dpr;
    const ctx = canvas.getContext("2d");
    // ctx.scale(dpr, dpr); // not needed?
    return ctx;
  }
  
  function render(ctx, strokes) {
    if (!ctx) { return }
    if (strokes) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      strokes.forEach((s) => drawStroke(ctx, s));
    }
  
    ctx.beginPath();
    if (eraseMode) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }

  function drawStroke(ctx, stroke) {
    if (!stroke || !stroke.length) {
      return;
    }
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }

  return React.createElement("canvas", {
    ref, 
    onMouseMove, 
    onMouseDown, 
    onTouchStart, 
    onTouchMove
  })
}

export function create(deviceAttrs, handle) {
  handle.change((doc) => {
    doc.strokes = []
  })
}

export const contentType = {
  type: "ink",
  name: "Ink",
  icon: "pencil",
  contexts: {
    board: Widget,
    expanded: Widget,
  },
  create
}
