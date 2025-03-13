// components/Arrow.js
import React from 'react';
import { Line, Polygon } from 'react-native-svg';

const Arrow = ({ start, end }) => {
  // Calculate the angle of the line.
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);

  // Arrowhead dimensions.
  const arrowLength = 10;
  const arrowWidth = 6;

  // Calculate arrowhead points.
  const arrowPoint1 = {
    x: end.x - arrowLength * Math.cos(angle - Math.PI / 6),
    y: end.y - arrowLength * Math.sin(angle - Math.PI / 6),
  };
  const arrowPoint2 = {
    x: end.x - arrowLength * Math.cos(angle + Math.PI / 6),
    y: end.y - arrowLength * Math.sin(angle + Math.PI / 6),
  };

  const points = `${end.x},${end.y} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`;

  return (
    <>
      <Line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="black"
        strokeWidth="2"
      />
      <Polygon points={points} fill="black" />
    </>
  );
};

export default Arrow;
