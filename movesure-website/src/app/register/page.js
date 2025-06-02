'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../utils/supabase';
import bcrypt from 'bcryptjs';
import { User, Lock, Upload, Eye, EyeOff, Truck, Shield, CheckCircle, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    post: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check password strength
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 6) strength += 25;
      if (value.length >= 8) strength += 25;
      if (/[A-Z]/.test(value)) strength += 25;
      if (/[0-9]/.test(value)) strength += 25;
      setPasswordStrength(strength);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 2MB for base64 storage)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError(''); // Clear any previous errors
    }
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(formData.password, saltRounds);

      // Convert image to base64 if provided
      let imageBase64 = null;
      if (formData.image) {
        try {
          imageBase64 = await convertImageToBase64(formData.image);
          console.log('Image converted to base64 successfully');
        } catch (imageError) {
          console.error('Image conversion failed:', imageError);
          throw new Error('Failed to process image');
        }
      }

      // Insert user with base64 image
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            username: formData.username.trim(),
            password_hash: passwordHash,
            name: formData.name.trim() || null,
            post: formData.post.trim() || null,
            branch_id: null,
            image_url: imageBase64, // Store base64 string directly
            is_active: true,
            is_staff: false
          }
        ])
        .select()
        .single();

      if (userError) {
        console.error('User creation error:', userError);
        if (userError.code === '23505') {
          throw new Error('Username already exists');
        }
        throw new Error(`Registration failed: ${userError.message}`);
      }

      console.log('User created successfully:', userData);

      // Show success message and redirect to login
      alert('Registration successful! Redirecting to login page...');
      router.push('/login');

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return 'bg-green-500';
    if (passwordStrength >= 50) return 'bg-yellow-500';
    if (passwordStrength >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength >= 75) return 'Strong';
    if (passwordStrength >= 50) return 'Medium';
    if (passwordStrength >= 25) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2s"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4s"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-xl shadow-lg">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Movesure.io</h1>
              <p className="text-blue-200 text-sm font-medium">AI-Powered Transport Solutions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Shield className="w-5 h-5 text-blue-300" />
            <span className="text-sm text-blue-200 font-medium">Secure Registration</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
              Join Movesure.io
            </h2>
            <p className="text-blue-200 text-xl mb-8 font-light">
              Create your account and revolutionize your transport business
            </p>
            <div className="flex items-center justify-center space-x-8 text-blue-200 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse animation-delay-1s"></div>
                <span>Cloud-Based</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse animation-delay-2s"></div>
                <span>Secure</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white/10 backdrop-blur-xl py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-12 border border-white/20 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            
            <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/20 border border-red-400/50 text-red-100 px-6 py-4 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Profile Image Upload */}
              <div className="text-center">
                <div className="relative inline-block group">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 p-1 mx-auto shadow-xl">
                    <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border-2 border-white/30">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-10 h-10 text-white/70" />
                      )}
                    </div>
                  </div>
                  <label
                    htmlFor="image"
                    className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-full cursor-pointer transition-all duration-200 shadow-xl hover:scale-110 group-hover:shadow-2xl"
                  >
                    <Upload className="w-5 h-5" />
                  </label>
                  <input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <p className="text-blue-200 text-sm mt-3 font-medium">Upload profile image (Max 2MB)</p>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-white mb-3">
                  Username *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-blue-300 group-focus-within:text-blue-200 transition-colors" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="block w-full pl-12 pr-4 py-4 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm placeholder-blue-200 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 font-medium"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-white mb-3">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-4 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm placeholder-blue-200 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 font-medium"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Post/Position */}
              <div>
                <label htmlFor="post" className="block text-sm font-semibold text-white mb-3">
                  Post/Position
                </label>
                <div className="relative">
                  <input
                    id="post"
                    name="post"
                    type="text"
                    value={formData.post}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-4 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm placeholder-blue-200 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 font-medium"
                    placeholder="e.g., Manager, Driver, Admin"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-3">
                  Password *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-300 group-focus-within:text-blue-200 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-12 pr-12 py-4 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm placeholder-blue-200 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 font-medium"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-blue-300 hover:text-white transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-blue-300 hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-blue-200 mb-2">
                      <span className="font-medium">Password Strength</span>
                      <span className="font-semibold">{getPasswordStrengthText()}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2.5 shadow-inner">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white mb-3">
                  Confirm Password *
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-blue-300 group-focus-within:text-blue-200 transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full pl-12 pr-12 py-4 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm placeholder-blue-200 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-200 font-medium"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-blue-300 hover:text-white transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-blue-300 hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="mt-3 flex items-center space-x-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Passwords match perfectly!</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full group relative flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-xl text-lg font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6 mr-3" />
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10">
              <div className="text-center">
                <span className="text-blue-200 font-medium">Already have an account? </span>
                <button
                  onClick={() => router.push('/login')}
                  className="text-blue-300 hover:text-white font-semibold transition-colors duration-200 underline decoration-blue-400 hover:decoration-white underline-offset-4 decoration-2"
                >
                  Sign in here
                </button>
              </div>
            </div>

            {/* Features Section */}
            <div className="mt-10 pt-8 border-t border-white/20">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-center space-x-3 text-blue-200 bg-white/5 rounded-lg py-3 px-4 backdrop-blur-sm">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-medium">256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-blue-200 bg-white/5 rounded-lg py-3 px-4 backdrop-blur-sm">
                  <Truck className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium">AI-Powered Transport Management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        .animation-delay-1s {
          animation-delay: 1s;
        }
        .animation-delay-2s {
          animation-delay: 2s;
        }
        .animation-delay-4s {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}