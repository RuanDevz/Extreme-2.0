import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import ReportModal from '../components/ui/ReportModal';
import ContentLimitModal from '../components/ui/ContentLimitModal';
import CommentSection from '../components/ui/CommentSection';
import LikeButton from '../components/ui/LikeButton';
import { ArrowLeft, ExternalLink, Share2, MoveVertical as MoreVertical, Eye, Calendar, User, Flag, Download, Play, Image as ImageIcon, Video, HardDrive } from 'lucide-react';
import type { Content } from '../types';
import { contentApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { linkvertise } from '../components/Linkvertise/Linkvertise';
import LoadingScreen from '../components/LoadingScreen';
import AgeVerificationModal from '../components/ui/AgeVerificationModal';
import { ageVerificationApi } from '../services/api';

const ContentDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [relatedContents, setRelatedContents] = useState<Content[]>([]);
  const [generalContents, setGeneralContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showContentLimit, setShowContentLimit] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const { user, fetchUser } = useAuthStore();
  const anchorRef = useRef<HTMLAnchorElement|null>(null);

  const getuserdata = localStorage.getItem("user");
  const parsed = getuserdata ? JSON.parse(getuserdata) : null;
  const isPremium = parsed?.isPremium;
  const isAdmin = parsed?.isAdmin;

  const location = useLocation(); 

    useEffect(() => {
    fetchUser(); 
  }, [fetchUser]);

  useEffect(() => {
    if (content) {
      if (!user?.isPremium) {
        setTimeout(() => {
          linkvertise("1404433", { whitelist: ["mega.nz"] });
        }, 700);
      }
    }
  }, [content, location.pathname, user]);

  useEffect(() => {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    window.scrollTo({ top: 10, behavior: 'auto' });
  }
}, [slug]);

  useEffect(() => {
    const checkAge = async () => {
      const ageConfirmed = localStorage.getItem('ageConfirmed');
      let needs = false;
      if (ageConfirmed !== 'true') {
        try {
          const status = await ageVerificationApi.getStatus();
          needs = !status.ageConfirmed;
        } catch {
          needs = true;
        }
      }
      setShowAgeVerification(needs);
    };
    checkAge();
  }, []);

  const handleAgeVerificationConfirm = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setShowAgeVerification(false);
  };

  const handleAgeVerificationExit = () => {
    window.location.href = 'https://www.google.com';
  };

  const handleMegaLinkClick = async () => {
    if (!content) return;

    try {
      await contentApi.recordView(content.id);
      setContent(prev => prev ? { ...prev, views: prev.views + 1 } : null);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };
      
  // Check content limit for unverified users
  useEffect(() => {
    if (user && !user.isVerified) {
      const viewedContent = JSON.parse(localStorage.getItem('viewedContent') || '[]');
      if (viewedContent.length >= 3 && !viewedContent.includes(slug!)) {
        setShowContentLimit(true);
        return;
      }
    }
  }, [user, slug]);
  
  useEffect(() => {
    const fetchContentData = async () => {
      if (!slug) {
        navigate('/');
        return;
      }

      // Check content limit for unverified users
      if (user && !user.isVerified) {
        const viewedContent = JSON.parse(localStorage.getItem('viewedContent') || '[]');
        if (viewedContent.length >= 3 && !viewedContent.includes(slug)) {
          setShowContentLimit(true);
          setLoading(false);
          return;
        }

        // Add current content to viewed list
        if (!viewedContent.includes(slug)) {
          viewedContent.push(slug);
          localStorage.setItem('viewedContent', JSON.stringify(viewedContent));
        }
      }

      try {
        setLoading(true);
        
        // Carregar dados do conteúdo
        const contentData = await contentApi.getBySlug(slug);
        setContent(contentData);
        
        // Carregar conteúdos relacionados da mesma modelo
        if (contentData.model_id) {
          const relatedData = await contentApi.getByModel(contentData.model_id, { 
            limit: 6,
            sortBy: 'recent'
          });
          // Filtrar o conteúdo atual da lista de relacionados
          const filtered = (relatedData.contents || []).filter(c => c.id !== contentData.id);
          setRelatedContents(filtered);
          
          if (filtered.length < 3) {
            const generalData = await contentApi.getAll({ 
              limit: 8,
              sortBy: 'recent'
            });
            // Filtrar o conteúdo atual e os já relacionados
            const generalFiltered = (generalData.contents || [])
              .filter(c => c.id !== contentData.id && !filtered.some(r => r.id === c.id))
              .slice(0, 6);
            setGeneralContents(generalFiltered);
          }
        }
      } catch (error) {
        console.error('Error loading content:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchContentData();
  }, [slug, navigate, user]);

  const handleResendVerification = async () => {
    if (user?.email) {
      try {
        window.open('/resend-verification', '_blank');
        setShowContentLimit(false);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleShare = async () => {
    if (!content) return;

    const shareData = {
      title: content.title,
      text: `Check out ${content.title} by ${content.model?.name}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // cancelado
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
    setShowDropdown(false);
  };

  const formatViews = (views: number) => {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      maximumFractionDigits: 1 
    }).format(views);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleContentClick = (targetSlug: string) => {
    if (!targetSlug || targetSlug === slug) return;
    navigate(`/content/${targetSlug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingScreen/>;
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-300">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Content not found</h2>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AgeVerificationModal
        isOpen={showAgeVerification}
        onConfirm={handleAgeVerificationConfirm}
        onExit={handleAgeVerificationExit}
      />

      <main className={`pt-20 min-h-screen bg-dark-300 ${showAgeVerification ? 'blur-sm pointer-events-none select-none' : ''}`}>
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-400 hover:text-primary-500 transition-colors mb-6"
          >
            <ArrowLeft size={20} className="mr-2" />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Content Header */}
              <div className="bg-dark-200 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-3" />
                    <h1 className="text-3xl font-bold text-white mb-3">
                      {content.title}
                    </h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center">
                        <Eye size={16} className="mr-1 text-primary-500" />
                        <span>{formatViews(content.views)} views</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-1 text-primary-500" />
                        <span>{new Date(content.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="bg-dark-300 hover:bg-dark-100 text-white p-2 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-dark-200 rounded-lg shadow-lg overflow-hidden z-10">
                        <button
                          onClick={handleShare}
                          className="w-full px-4 py-3 text-left text-gray-300 hover:bg-dark-100 flex items-center"
                        >
                          <Share2 size={16} className="mr-2" />
                          Share Content
                        </button>
                        <button
                          onClick={() => {
                            setShowReportModal(true);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left text-gray-300 hover:bg-dark-100 flex items-center"
                        >
                          <Flag size={16} className="mr-2" />
                          Report Content
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mega Link Section */}
                <div className="relative overflow-hidden rounded-3xl shadow-2xl min-h-[400px] md:min-h-[500px]">
                  {content.model?.photoUrl && content.model_id && (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url(${content.model.photoUrl})`,
                          filter: 'blur(10px)',
                          transform: 'scale(1.2)'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-primary-900/80 to-black/90" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                    </>
                  )}
                  {(!content.model_id || !content.model?.photoUrl) && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 to-black/90" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                    </>
                  )}

                  <div className="relative h-full flex flex-col justify-between p-6 md:p-8">
                    <div className="flex items-start justify-between mb-6">
                      {content.model_id && content.model && (
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-4 ring-white/20 shadow-xl">
                            <img
                              src={content.model.photoUrl}
                              alt={content.model.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                              {content.model.name}
                            </h3>
                            <p className="text-white/80 text-sm md:text-base">Exclusive Content</p>
                          </div>
                        </div>
                      )}
                      {!content.model_id && (
                        <div>
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                            {content.title}
                          </h3>
                          <p className="text-white/80 text-sm md:text-base">Exclusive Content</p>
                        </div>
                      )}
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                        <div className="flex items-center text-white">
                          <Eye size={16} className="mr-2 text-primary-400" />
                          <span className="font-bold">{formatViews(content.views)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl shadow-2xl mb-4 ring-4 ring-primary-500/30">
                          <Download size={28} className="text-white" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                          Download
                        </h3>
                        <p className="text-white/80 text-base md:text-lg">
                          Unlock exclusive content now
                        </p>
                      </div>
                      
                      <a onClick={handleMegaLinkClick} ref={anchorRef} href={content?.url} target="_blank" rel="noopener noreferrer" style={{display:'none'}} />
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => anchorRef.current?.click()}
                      >
                        Mega Link
                      </Button>
                      
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-4 text-white/70 text-sm">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                            <span>Secure Download</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                            <span>18+ Content</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-purple-400 rounded-full mr-2" />
                            <span>Premium Quality</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {content.info && (
                      <div className="mt-8">
                        <h4 className="text-white/90 text-sm font-medium mb-4 text-center">Package Contents</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {content.info.images && content.info.images > 0 && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 hover:bg-white/15 transition-all">
                              <ImageIcon size={28} className="text-blue-400 mx-auto mb-2" />
                              <div className="text-white font-bold text-xl">{content.info.images}</div>
                              <div className="text-white/70 text-sm">High-Res Images</div>
                            </div>
                          )}
                          {content.info.videos && content.info.videos > 0 && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 hover:bg-white/15 transition-all">
                              <Video size={28} className="text-red-400 mx-auto mb-2" />
                              <div className="text-white font-bold text-xl">{content.info.videos}</div>
                              <div className="text-white/70 text-sm">HD Videos</div>
                            </div>
                          )}
                          {content.info.size && content.info.size > 0 && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 hover:bg-white/15 transition-all">
                              <HardDrive size={28} className="text-green-400 mx-auto mb-2" />
                              <div className="text-white font-bold text-xl">{formatFileSize(content.info.size)}</div>
                              <div className="text-white/70 text-sm">Total Size</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <LikeButton
                    contentId={content.id}
                    type="content"
                    size="lg"
                  />
                </div>
              </div>

              {content.model && content.model_id && (
                <div className="bg-dark-200 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">About the Model</h3>
                  <div className="flex items-start space-x-4">
                    <img
                      src={content.model.photoUrl}
                      alt={content.model.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white mb-2">{content.model.name}</h4>
                      {content.model.bio && (
                        <p className="text-gray-300 text-sm mb-4 line-clamp-3">{content.model.bio}</p>
                      )}
                      <Link
                        to={`/model/${content.model.slug}`}
                        className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                      >
                        <User size={16} className="mr-2" />
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <CommentSection
                  contentId={content.id}
                  type="content"
                />
              </div>
            </div>

            {/* Sidebar - Related Content */}
            <div className="lg:col-span-1">
              <div className="bg-dark-200 rounded-xl shadow-lg p-6 sticky top-24">
                {relatedContents.length > 0 ? (
                  <h3 className="text-xl font-semibold text-white mb-4">
                    More from {content.model?.name}
                  </h3>
                ) : (
                  <h3 className="text-xl font-semibold text-white mb-4">
                    More Content
                  </h3>
                )}
                
                <div className="space-y-4">
                  {(relatedContents.length > 0 ? relatedContents : generalContents).length > 0 ? (
                    (relatedContents.length > 0 ? relatedContents : generalContents).map((relatedContent) => (
                      <button
                        key={relatedContent.id}
                        onClick={() => handleContentClick(relatedContent.slug)}
                        className="block group w-full text-left"
                      >
                        <div className="flex space-x-3 p-3 rounded-lg hover:bg-dark-300 transition-colors">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-dark-400">
                            {relatedContent.thumbnailUrl ? (
                              <img
                                src={relatedContent.thumbnailUrl}
                                alt={relatedContent.title}
                                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <img
                                src={relatedContent.model?.photoUrl}
                                alt={relatedContent.title}
                                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-sm group-hover:text-primary-400 transition-colors line-clamp-2 mb-1">
                              {relatedContent.title}
                            </h4>
                            {relatedContent.model && (
                              <p className="text-xs text-gray-400 mb-1">
                                by {relatedContent.model.name}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-400">
                              <Eye size={12} className="mr-1" />
                              <span>{formatViews(relatedContent.views)}</span>
                              <span className="mx-1">•</span>
                              <span>{new Date(relatedContent.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">📱</div>
                      <p className="text-gray-400 text-sm">Loading more content...</p>
                    </div>
                  )}
                </div>

                {content.model && content.model_id && (
                  <div className="mt-6 pt-6 border-t border-dark-100">
                    <button
                      onClick={() => navigate(`/model/${content.model!.slug}`)}
                      className="w-full text-center px-4 py-3 bg-dark-300 hover:bg-dark-100 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      View All Content from {content.model.name}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentId={content?.id}
        title={content?.title || 'Content'}
      />
      
      <ContentLimitModal
        isOpen={showContentLimit}
        onClose={() => {
          setShowContentLimit(false);
          navigate('/');
        }}
        onVerifyEmail={handleResendVerification}
      />
    </>
  );
};

export default ContentDetail;
