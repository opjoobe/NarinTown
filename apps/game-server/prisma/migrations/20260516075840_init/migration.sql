-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
    "skills" TEXT[],
    "bio" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "guess" BOOLEAN,
    "isCorrect" BOOLEAN NOT NULL,
    "forfeited" BOOLEAN NOT NULL DEFAULT false,
    "pointsDelta" INTEGER NOT NULL DEFAULT 0,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LastPosition" (
    "userId" TEXT NOT NULL,
    "mapId" TEXT NOT NULL DEFAULT 'default',
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "dir" TEXT NOT NULL DEFAULT 'down',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastPosition_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "code" TEXT NOT NULL,
    "usedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviteCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE INDEX "Attempt_challengerId_idx" ON "Attempt"("challengerId");

-- CreateIndex
CREATE INDEX "Attempt_targetId_idx" ON "Attempt"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_challengerId_targetId_key" ON "Attempt"("challengerId", "targetId");

-- CreateIndex
CREATE INDEX "Score_points_correctCount_bestStreak_idx" ON "Score"("points" DESC, "correctCount" DESC, "bestStreak" DESC);

-- CreateIndex
CREATE INDEX "MagicLink_email_idx" ON "MagicLink"("email");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LastPosition" ADD CONSTRAINT "LastPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
