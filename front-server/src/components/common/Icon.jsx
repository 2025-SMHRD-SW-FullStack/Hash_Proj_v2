import React from 'react'

const Icon = ({ src, alt, className, onClick }) => {

  return (
    <img
    src={src}
    alt={alt}
    onClick={onClick}
    className={`${className} w-8 h-8 cursor-pointer `}
    />
  )
}

export default Icon