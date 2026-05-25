import { useState, useEffect, useRef } from 'react';
import { HiOutlineX } from 'react-icons/hi';

const CategoryModal = ({ isOpen, onClose, onSubmit, category, loading }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);

  const isEdit = !!category;

  // Prefill form when editing, reset when creating
  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          name: category.name || '',
          description: category.description || '',
        });
      } else {
        setFormData({ name: '', description: '' });
      }
      setErrors({});

      // Auto-focus the name field
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, category]);

  // Form validation
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Description cannot exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              {isEdit ? 'Edit Category' : 'New Category'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="category-name"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="category-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Interior Doors"
                  className={`
                    w-full px-3 py-2.5 border rounded-lg text-gray-800
                    placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm
                    ${
                      errors.name
                        ? 'border-red-300 focus:ring-red-400/50'
                        : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                    }
                  `}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Description Field */}
              <div>
                <label
                  htmlFor="category-description"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="category-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description for this category"
                  rows={3}
                  className={`
                    w-full px-3 py-2.5 border rounded-lg text-gray-800
                    placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm resize-none
                    ${
                      errors.description
                        ? 'border-red-300 focus:ring-red-400/50'
                        : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                    }
                  `}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400 text-right">
                  {formData.description.length}/200
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200
                  ${
                    loading
                      ? 'bg-brand-400 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] shadow-sm'
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : isEdit ? (
                  'Update Category'
                ) : (
                  'Save Category'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CategoryModal;
