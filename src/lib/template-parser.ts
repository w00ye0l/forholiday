// 이메일 템플릿 파서 및 렌더러
import { EditableTemplateContent, TEMPLATE_EDIT_CONFIGS } from '@/types/email-template';

export class EmailTemplateParser {
  /**
   * HTML 템플릿에서 편집 가능한 내용을 추출
   */
  static parseEditableContent(templateKey: string, htmlTemplate: string): EditableTemplateContent {
    const content: EditableTemplateContent = {};
    
    switch (templateKey) {
      case 'storage-confirmation':
        return this.parseStorageTemplate(htmlTemplate);
      
      case 'data-transfer-completion':
        return this.parseDataTransferTemplate(htmlTemplate);
      
      case 'general-email':
        return this.parseGeneralTemplate(htmlTemplate);
      
      default:
        return {};
    }
  }
  
  /**
   * 편집 가능한 내용을 HTML 템플릿에 적용
   */
  static renderTemplate(
    templateKey: string, 
    baseTemplate: string, 
    content: EditableTemplateContent
  ): string {
    switch (templateKey) {
      case 'storage-confirmation':
        return this.renderStorageTemplate(baseTemplate, content);
      
      case 'data-transfer-completion':
        return this.renderDataTransferTemplate(baseTemplate, content);
      
      case 'general-email':
        return this.renderGeneralTemplate(baseTemplate, content);
      
      default:
        return baseTemplate;
    }
  }
  
  private static parseStorageTemplate(html: string): EditableTemplateContent {
    const content: EditableTemplateContent = {};
    
    // 인사말 추출
    const greetingMatch = html.match(/<p>ForHoliday[\s\S]*?감사합니다\.<\/p>/);
    if (greetingMatch) {
      content.greeting = greetingMatch[0].replace(/<\/?p>/g, '');
    }
    
    // 중요 안내사항 추출
    const notesMatch = html.match(/<ul style="margin: 10px 0; padding-left: 20px;">([\s\S]*?)<\/ul>/);
    if (notesMatch) {
      const items = notesMatch[1].match(/<li>(.*?)<\/li>/g);
      if (items) {
        content.storage_important_notes = items.map(item => 
          item.replace(/<\/?li>/g, '').trim()
        );
      }
    }
    
    // 하단 메시지 추출
    const footerMatch = html.match(/<p>문의사항이 있으시면.*?연락 주세요\.<\/p>/);
    if (footerMatch) {
      content.storage_footer_message = footerMatch[0].replace(/<\/?p>/g, '');
    }
    
    return content;
  }
  
  private static parseDataTransferTemplate(html: string): EditableTemplateContent {
    const content: EditableTemplateContent = {};
    
    // 인사말 추출
    const greetingMatch = html.match(/<p>포할리데이를[\s\S]*?안내드립니다\.<\/p>/);
    if (greetingMatch) {
      content.greeting = greetingMatch[0].replace(/<\/?p>/g, '');
    }
    
    // 다운로드 안내 메시지 추출
    const downloadMsgMatch = html.match(/<p>아래 링크를.*?있습니다\.<\/p>/);
    if (downloadMsgMatch) {
      content.download_message = downloadMsgMatch[0].replace(/<\/?p>/g, '');
    }
    
    // 다운로드 버튼 텍스트 추출
    const buttonMatch = html.match(/<h3.*?>(.+?)<\/h3>/);
    if (buttonMatch) {
      content.download_button_text = buttonMatch[1];
    }
    
    // 첨부파일 안내 추출
    const attachmentMatch = html.match(/<p style="color: #666; font-size: 14px;">(.*?)<\/p>/);
    if (attachmentMatch) {
      content.attachment_info = attachmentMatch[1];
    }
    
    // 데이터 보관 일수 추출
    const retentionMatch = html.match(/데이터는 <strong>(\d+)일간<\/strong>/);
    if (retentionMatch) {
      content.data_retention_days = parseInt(retentionMatch[1]);
    }
    
    // 중요 안내사항 추출
    const notesMatch = html.match(/<ul style="margin: 10px 0; padding-left: 20px;">([\s\S]*?)<\/ul>/);
    if (notesMatch) {
      const items = notesMatch[1].match(/<li>([\s\S]*?)<\/li>/g);
      if (items) {
        content.important_notes = items.map(item => 
          item.replace(/<\/?li>/g, '').replace(/<strong>(.*?)<\/strong>/g, '$1').trim()
        );
      }
    }
    
    // 추가 안내사항 추출
    const additionalMatch = html.match(/<p>문의사항이.*?연락주세요\.<\/p>/);
    if (additionalMatch) {
      content.additional_message = additionalMatch[0].replace(/<\/?p>/g, '');
    }
    
    return content;
  }
  
  private static parseGeneralTemplate(html: string): EditableTemplateContent {
    // 일반 템플릿의 내용 부분 추출
    const contentMatch = html.match(/<div class="content">([\s\S]*?)<\/div>/);
    const content: EditableTemplateContent = {};
    
    if (contentMatch) {
      content.custom_content = contentMatch[1].trim();
    }
    
    return content;
  }
  
  private static renderStorageTemplate(
    baseTemplate: string, 
    content: EditableTemplateContent
  ): string {
    let rendered = baseTemplate;
    
    // 인사말 적용
    if (content.greeting) {
      rendered = rendered.replace(
        /<p>ForHoliday[\s\S]*?감사합니다\.<\/p>/,
        `<p>${content.greeting}</p>`
      );
    }
    
    // 중요 안내사항 적용
    if (content.storage_important_notes && content.storage_important_notes.length > 0) {
      const notesHtml = content.storage_important_notes
        .map(note => `          <li>${note}</li>`)
        .join('\n');
      
      rendered = rendered.replace(
        /<ul style="margin: 10px 0; padding-left: 20px;">([\s\S]*?)<\/ul>/,
        `<ul style="margin: 10px 0; padding-left: 20px;">\n${notesHtml}\n        </ul>`
      );
    }
    
    // 하단 메시지 적용
    if (content.storage_footer_message) {
      rendered = rendered.replace(
        /<p>문의사항이 있으시면.*?연락 주세요\.<\/p>/,
        `<p>${content.storage_footer_message}</p>`
      );
    }
    
    return rendered;
  }
  
  private static renderDataTransferTemplate(
    baseTemplate: string, 
    content: EditableTemplateContent
  ): string {
    let rendered = baseTemplate;
    
    // 인사말 적용
    if (content.greeting) {
      rendered = rendered.replace(
        /<p>포할리데이를[\s\S]*?안내드립니다\.<\/p>/,
        `<p>${content.greeting}</p>`
      );
    }
    
    // 다운로드 안내 메시지 적용
    if (content.download_message) {
      rendered = rendered.replace(
        /<p>아래 링크를.*?있습니다\.<\/p>/,
        `<p>${content.download_message}</p>`
      );
    }
    
    // 다운로드 버튼 텍스트 적용
    if (content.download_button_text) {
      rendered = rendered.replace(
        /<h3 style="color: #2E7D32; margin-top: 0;">(.+?)<\/h3>/,
        `<h3 style="color: #2E7D32; margin-top: 0;">${content.download_button_text}</h3>`
      );
    }
    
    // 첨부파일 안내 적용
    if (content.attachment_info) {
      rendered = rendered.replace(
        /<p style="color: #666; font-size: 14px;">(.*?)<\/p>/,
        `<p style="color: #666; font-size: 14px;">${content.attachment_info}</p>`
      );
    }
    
    // 다운로드 링크 적용 (새로운 기능)
    if (content.download_link) {
      const downloadSection = `
        <div class="download-section">
          <h3 style="color: #2E7D32; margin-top: 0;">${content.download_button_text || '📥 데이터 다운로드'}</h3>
          <p>${content.download_message || '아래 링크를 통해 데이터를 다운로드 받으실 수 있습니다.'}</p>
          <a href="${content.download_link}" class="download-button" style="display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold;">
            ${content.download_button_text || '다운로드'}
          </a>
          <p style="color: #666; font-size: 14px;">${content.attachment_info || '[다운로드 링크는 첨부파일 또는 별도 안내를 통해 제공됩니다]'}</p>
        </div>`;
      
      rendered = rendered.replace(
        /<div class="download-section">[\s\S]*?<\/div>/,
        downloadSection
      );
    }
    
    // 데이터 보관 일수 적용
    if (content.data_retention_days) {
      rendered = rendered.replace(
        /데이터는 <strong>\d+일간<\/strong>/,
        `데이터는 <strong>${content.data_retention_days}일간</strong>`
      );
    }
    
    // 중요 안내사항 적용
    if (content.important_notes && content.important_notes.length > 0) {
      const notesHtml = content.important_notes
        .map(note => `          <li>${note}</li>`)
        .join('\n');
      
      rendered = rendered.replace(
        /<ul style="margin: 10px 0; padding-left: 20px;">([\s\S]*?)<\/ul>/,
        `<ul style="margin: 10px 0; padding-left: 20px;">\n${notesHtml}\n        </ul>`
      );
    }
    
    // 추가 안내사항 적용
    if (content.additional_message) {
      rendered = rendered.replace(
        /<p>문의사항이.*?연락주세요\.<\/p>/,
        `<p>${content.additional_message}</p>`
      );
    }
    
    return rendered;
  }
  
  private static renderGeneralTemplate(
    baseTemplate: string, 
    content: EditableTemplateContent
  ): string {
    if (content.custom_content) {
      return baseTemplate.replace(
        /<div class="content">([\s\S]*?)<\/div>/,
        `<div class="content">\n      ${content.custom_content}\n    </div>`
      );
    }
    
    return baseTemplate;
  }
  
  /**
   * 템플릿별 편집 설정 정보 반환
   */
  static getEditConfig(templateKey: string) {
    return TEMPLATE_EDIT_CONFIGS.find(config => config.template_key === templateKey);
  }
}