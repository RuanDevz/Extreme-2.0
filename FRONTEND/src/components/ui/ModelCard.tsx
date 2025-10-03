import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, MapPin, Calendar, Star, Heart, Video, Camera, Zap, Music, Users, Crown } from 'lucide-react';
import type { Model } from '../../types';
import { linkvertise } from '../Linkvertise/Linkvertise';
import { useAuthStore } from '../../store/authStore';

interface ModelCardProps {
  model: Model;
}

const ModelCard: React.FC<ModelCardProps> = ({ model }) => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.isPremium && !user?.isAdmin) {
      linkvertise("1329936", { whitelist: ["mega.nz"] });
    }
  }, [user]);

  const formatViews = (views: number) => {
    return new Intl.NumberFormat('en-US', { 
      notation: 'compact',
      maximumFractionDigits: 1 
    }).format(views);
  };

  const getEthnicityLabel = (ethnicity?: string) => {
    const labels = {
      arab: 'Arab',
      asian: 'Asian',
      ebony: 'Ebony',
      indian: 'Indian',
      latina: 'Latina',
      white: 'White'
    };
    return ethnicity ? labels[ethnicity as keyof typeof labels] : '';
  };

const getTagIcon = (tag: string) => {
  const iconMap: { [key: string]: JSX.Element } = {
    'INFLUENCER': <Star size={12} className="text-yellow-500" />,
    'PORN_STAR': <Crown size={12} className="text-red-500" />,
    'TIKTOK_STAR': <Music size={12} className="text-pink-500" />,
    'COSPLAYER': <Users size={12} className="text-purple-500" />,
    'CHEERLEADER': <Star size={12} className="text-blue-500" />,
    'GAMER': <Zap size={12} className="text-green-500" />,
    'MASTURBATION': <Heart size={12} className="text-red-400" />,
    'KISSING': <Heart size={12} className="text-pink-400" />,
    'BOOBS_TOUCHING': <Heart size={12} className="text-orange-400" />,
    'BOOBS_LICKING': <Heart size={12} className="text-red-400" />,
    'FINGERING': <Heart size={12} className="text-purple-400" />,
    'DILDO': <Zap size={12} className="text-blue-400" />,
    'ORAL': <Heart size={12} className="text-green-400" />,
    'BLOWJOB': <Heart size={12} className="text-indigo-400" />,
    'VAGINAL': <Heart size={12} className="text-pink-400" />,
    'DILDO_BLOWJOB': <Zap size={12} className="text-cyan-400" />,

    // novos
    'MODEL': <Users size={12} className="text-gray-500" />,
    'MUSICIAN': <Music size={12} className="text-yellow-600" />,
    'CAMGIRL': <Crown size={12} className="text-pink-600" />,
    'IDOL': <Star size={12} className="text-purple-600" />,
    'AV': <Zap size={12} className="text-red-600" />,
    'FETISH_MODEL': <Heart size={12} className="text-rose-500" />,
    'BUSINESS_WOMAN': <Users size={12} className="text-blue-600" />,
    'YOUTUBER': <Music size={12} className="text-red-500" />,
    'MILF_PORN_STAR': <Crown size={12} className="text-orange-600" />,
    'EXOTIC_DANCER': <Zap size={12} className="text-pink-500" />,
    'CENTERFOLD': <Star size={12} className="text-indigo-500" />,
    'ACTRESS': <Users size={12} className="text-green-600" />,
    'DIGITAL_CREATOR': <Zap size={12} className="text-teal-500" />,
    'PHOTOGRAPHER': <Camera size={12} className="text-gray-600" />,
    'PLAYBOY_MODEL': <Crown size={12} className="text-rose-600" />
  };
  return iconMap[tag] || <Star size={12} className="text-gray-400" />;
};


  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const hasContent = model.contents && model.contents.length > 0;
  const hasProfile = model.bio || model.hairColor || model.eyeColor || model.bodyType;

  const linkDestination = !hasProfile && hasContent
    ? `/content/${model.contents[0].slug}`
    : `/model/${model.slug}`;

  return (
    <Link
      to={linkDestination}
      className="group block overflow-hidden bg-dark-200 rounded-lg shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img 
          src={model.photoUrl} 
          alt={model.name} 
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-300/90"></div>
        

        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-lg text-white group-hover:text-primary-400 transition-colors mb-2">
            {model.name}
          </h3>
          
          <div className="space-y-1 mb-3">
            {model.birthDate && (
              <div className="flex items-center text-xs text-gray-300">
                <Calendar size={12} className="mr-1 text-primary-500" />
                <span>{calculateAge(model.birthDate)} years old</span>
              </div>
            )}
            
            {model.placeOfBirth && (
              <div className="flex items-center text-xs text-gray-300">
                <MapPin size={12} className="mr-1 text-primary-500" />
                <span>{model.placeOfBirth}</span>
              </div>
            )}
            
            {/* Tags com ícones */}
            {model.tags && model.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {model.tags.slice(0, 3).map((tag, index) => (
                  <div key={index} className="flex items-center bg-dark-300/50 px-2 py-1 rounded-full">
                    {getTagIcon(tag)}
                    <span className="text-xs text-gray-300 ml-1">
                      {tag}
                    </span>
                  </div>
                ))}
                {model.tags.length > 3 && (
                  <div className="flex items-center bg-dark-300/50 px-2 py-1 rounded-full">
                    <span className="text-xs text-gray-400">+{model.tags.length - 3}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-300">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Eye size={14} className="mr-1 text-primary-500" />
                <span>{formatViews(model.views)}</span>
              </div>
              
              {model.tags && model.tags.length > 0 && (
                <div className="flex items-center">
                  <span className="text-xs bg-dark-300/50 px-2 py-1 rounded">
                    {model.tags.length} tag{model.tags.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-400">
              {new Date(model.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ModelCard;
