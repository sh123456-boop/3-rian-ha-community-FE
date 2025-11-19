# 가벼운 알파인 기반 Node 20 이미지 사용
FROM node:20-alpine            

# 애플리케이션 작업 디렉터리 설정
WORKDIR /app                   

# 의존성 정보만 먼저 복사해 캐시 활용
COPY package*.json ./          

 # 패키지 설치(재현성 보장, 프로덕션 의존성만)
RUN npm ci --only=production  

 # 나머지 소스 코드 복사
COPY . .                      

# 컨테이너가 청취할 포트 선언
EXPOSE 3000                    

 # 컨테이너 시작 시 실행할 명령
CMD ["node", "app.js"]         
