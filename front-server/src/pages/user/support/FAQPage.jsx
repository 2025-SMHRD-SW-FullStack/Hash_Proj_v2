import React, { useState } from "react";
import faqData from "../../../data/faq.json";

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAnswer = (categoryIndex, questionIndex) => {
    const currentKey = `${categoryIndex}-${questionIndex}`;
    setOpenIndex(openIndex === currentKey ? null : currentKey);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">자주 묻는 질문(FAQPage)</h2>
      {faqData.map((category, cIdx) => (
        <div key={cIdx} className="mb-6">
          <h3 className="text-xl font-semibold mb-2">{category.category}</h3>
          <div className="space-y-2">
            {category.items.map((faq, qIdx) => {
              const key = `${cIdx}-${qIdx}`;
              const isOpen = openIndex === key;

              return (
                <div
                  key={key}
                  className="border rounded-lg p-3 cursor-pointer bg-white shadow-sm"
                  onClick={() => toggleAnswer(cIdx, qIdx)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{faq.question}</span>
                    <span>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <p className="mt-2 text-gray-600">{faq.answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQPage;
