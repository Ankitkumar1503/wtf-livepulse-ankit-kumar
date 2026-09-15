import React from 'react';

export function SkeletonLoader({ height = '120px', width = '100%', borderRadius = '12px' }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius }}
    />
  );
}
