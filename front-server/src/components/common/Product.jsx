const Product = ({ product, onClick, isSimple = false }) => {
  if (!product) return null;

  const handleClick = () => onClick?.(product.id);

  const imgSrc = product.thumbnailUrl || testImg; // 서버 이미지가 없으면 테스트 이미지

  return (
    <div className='w-48 cursor-pointer' onClick={handleClick}>
      <img
        src={product.thumbnailUrl || testImg}
        alt={product.name}
        className='w-48 h-48 border border-solid rounded-xl'
      />
      <div className='w-full'>
        <strong className='text-lg break-all'>[{product.brand}] {product.name}</strong>
        <div>
          <span className='text-lg text-[#5882F6]'>{product.salePrice.toLocaleString()}원 </span>
          <span className='text-sm line-through text-gray-600'>{product.basePrice.toLocaleString()}원</span>
        </div>
        {!isSimple && (
          <>
            <span>재고수 {product.stockTotal?.toLocaleString() || 0}개</span>
            <div>
              <span>지급 포인트 {product.feedbackPoint.toLocaleString()}</span>
              <span className='text-[#5882F6]'>P</span>
            </div>
            <span>모집 기간 ~{product.saleEndAt?.slice(0, 10)}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default Product